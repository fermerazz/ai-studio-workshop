import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Chess } from 'chess.js';
import {
  PieceColor,
  RoomState,
  TimeControl,
  BoardTheme,
  MoveRecord,
} from './types/chess';
import { ChessBoard } from './components/ChessBoard';
import { ChessClock } from './components/ChessClock';
import { CapturedPieces } from './components/CapturedPieces';
import { MoveHistory } from './components/MoveHistory';
import { GameChat } from './components/GameChat';
import { CreateGameModal } from './components/CreateGameModal';
import { ShareGameModal } from './components/ShareGameModal';
import { GameOverModal } from './components/GameOverModal';
import {
  playMoveSound,
  playCaptureSound,
  playCheckSound,
  playVictorySound,
  setSoundEnabled,
  isSoundEnabled,
} from './utils/sound';
import {
  Swords,
  Volume2,
  VolumeX,
  RotateCcw,
  Flag,
  Handshake,
  Share2,
  Users,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Palette,
  ExternalLink,
  Crown,
} from 'lucide-react';

export default function App() {
  // Session Identity
  const [playerId] = useState<string>(() => {
    let saved = localStorage.getItem('chess_player_id');
    if (!saved) {
      saved = Math.random().toString(36).substring(2, 12);
      localStorage.setItem('chess_player_id', saved);
    }
    return saved;
  });

  const [playerName, setPlayerName] = useState<string>(() => {
    return localStorage.getItem('chess_player_name') || 'Player';
  });

  // App State
  const [currentRoom, setCurrentRoom] = useState<RoomState | null>(null);
  const [yourColor, setYourColor] = useState<PieceColor | null>(null);
  const [boardOrientation, setBoardOrientation] = useState<PieceColor>('w');
  const [boardTheme, setBoardTheme] = useState<BoardTheme>('classic-wood');
  const [soundOn, setSoundOn] = useState<boolean>(true);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'moves' | 'chat'>('moves');
  const [isPassAndPlay, setIsPassAndPlay] = useState<boolean>(false);

  // Local Pass & Play fallback game state
  const [localChess, setLocalChess] = useState<Chess>(() => new Chess());
  const [localHistory, setLocalHistory] = useState<MoveRecord[]>([]);

  // WebSocket reference
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Save player name
  const handleNameChange = (newName: string) => {
    setPlayerName(newName);
    localStorage.setItem('chess_player_name', newName);
  };

  // Sound toggle
  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
  };

  // Connect WebSocket on mount
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    let ws: WebSocket;
    let reconnectTimeout: any;

    function connect() {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        // Check if room code was passed in URL query param
        const urlParams = new URLSearchParams(window.location.search);
        const urlRoom = urlParams.get('room');
        if (urlRoom && !currentRoom) {
          ws.send(
            JSON.stringify({
              type: 'JOIN_ROOM',
              data: {
                roomCode: urlRoom.toUpperCase(),
                playerName,
                playerId,
              },
            })
          );
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          handleServerMessage(msg);
        } catch (err) {
          console.error('Error parsing WS message:', err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        reconnectTimeout = setTimeout(connect, 2000);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, []);

  // Update URL param when room changes
  useEffect(() => {
    if (currentRoom?.code) {
      const url = new URL(window.location.href);
      url.searchParams.set('room', currentRoom.code);
      window.history.replaceState({}, '', url.toString());
    }
  }, [currentRoom?.code]);

  // Handle incoming WS messages
  const handleServerMessage = (msg: any) => {
    const { type, data, message } = msg;

    if (type === 'ROOM_CREATED' || type === 'ROOM_JOINED') {
      setYourColor(data.yourColor);
      setBoardOrientation(data.yourColor === 'b' ? 'b' : 'w');
      setIsPassAndPlay(false);
      setErrorMessage(null);
      if (type === 'ROOM_CREATED') {
        setIsShareModalOpen(true);
      }
    } else if (type === 'ROOM_STATE') {
      const nextRoom = data as RoomState;
      // Sound effects trigger
      if (currentRoom) {
        if (nextRoom.history.length > currentRoom.history.length) {
          const latestMove = nextRoom.history[nextRoom.history.length - 1];
          if (nextRoom.isCheck) {
            playCheckSound();
          } else if (latestMove?.captured) {
            playCaptureSound();
          } else {
            playMoveSound();
          }
        }

        if (nextRoom.isGameOver && !currentRoom.isGameOver) {
          playVictorySound();
        }
      }

      // Close share modal once friend joins and game begins
      if (currentRoom?.status === 'waiting' && nextRoom.status === 'in_progress') {
        setIsShareModalOpen(false);
      }

      setCurrentRoom(nextRoom);
    } else if (type === 'TIMER_SYNC') {
      if (currentRoom) {
        setCurrentRoom((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            whitePlayer: prev.whitePlayer
              ? { ...prev.whitePlayer, timeLeftMs: data.whiteTimeLeftMs }
              : null,
            blackPlayer: prev.blackPlayer
              ? { ...prev.blackPlayer, timeLeftMs: data.blackTimeLeftMs }
              : null,
            activeTimerColor: data.activeTimerColor,
          };
        });
      }
    } else if (type === 'ERROR') {
      setErrorMessage(message || 'Action failed');
      setTimeout(() => setErrorMessage(null), 4000);
    }
  };

  // Create game action
  const handleCreateRoom = (config: {
    playerName: string;
    preferredColor: 'w' | 'b' | 'random';
    timeControl: TimeControl;
  }) => {
    handleNameChange(config.playerName);
    setIsCreateModalOpen(false);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'CREATE_ROOM',
          data: {
            playerName: config.playerName,
            playerId,
            preferredColor: config.preferredColor,
            initialMinutes: config.timeControl.initialMinutes,
            incrementSeconds: config.timeControl.incrementSeconds,
          },
        })
      );
    }
  };

  // Join game action
  const handleJoinRoom = (code: string) => {
    const formatted = code.trim().toUpperCase();
    if (!formatted) return;

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'JOIN_ROOM',
          data: {
            roomCode: formatted,
            playerName,
            playerId,
          },
        })
      );
    }
  };

  // Authoritative Chess Instance
  const currentChess = useMemo(() => {
    if (isPassAndPlay) return localChess;
    if (!currentRoom) return new Chess();
    try {
      return new Chess(currentRoom.fen);
    } catch {
      return new Chess();
    }
  }, [currentRoom?.fen, isPassAndPlay, localChess]);

  // Move handler
  const handleMove = (move: { from: string; to: string; promotion?: string }) => {
    if (isPassAndPlay) {
      try {
        const nextChess = new Chess(localChess.fen());
        const result = nextChess.move({
          from: move.from,
          to: move.to,
          promotion: move.promotion || 'q',
        });
        if (result) {
          if (nextChess.inCheck()) playCheckSound();
          else if (result.captured) playCaptureSound();
          else playMoveSound();

          setLocalChess(nextChess);
          setLocalHistory((prev) => [
            ...prev,
            {
              from: result.from,
              to: result.to,
              san: result.san,
              piece: result.piece,
              color: result.color as PieceColor,
              captured: result.captured,
              fen: nextChess.fen(),
              timestamp: Date.now(),
            },
          ]);
        }
      } catch (e) {
        console.error('Local move illegal:', e);
      }
      return;
    }

    if (!currentRoom || currentRoom.status !== 'in_progress') return;

    // Check if it's our turn
    const turn = currentChess.turn();
    if (yourColor && turn !== yourColor) return;

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'MOVE',
          data: move,
        })
      );
    }
  };

  // In-game actions
  const handleResign = () => {
    if (!window.confirm('Are you sure you want to resign this match?')) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'RESIGN' }));
    }
  };

  const handleOfferDraw = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'OFFER_DRAW' }));
    }
  };

  const handleAcceptDraw = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'ACCEPT_DRAW' }));
    }
  };

  const handleDeclineDraw = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'DECLINE_DRAW' }));
    }
  };

  const handleOfferRematch = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'OFFER_REMATCH' }));
    }
  };

  const handleSendMessage = (text: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'CHAT_MESSAGE',
          data: { text },
        })
      );
    }
  };

  const handleLeaveRoom = () => {
    setCurrentRoom(null);
    setYourColor(null);
    setIsPassAndPlay(false);
    const url = new URL(window.location.href);
    url.searchParams.delete('room');
    window.history.replaceState({}, '', url.toString());
  };

  const startPassAndPlay = () => {
    setIsPassAndPlay(true);
    setCurrentRoom(null);
    setLocalChess(new Chess());
    setLocalHistory([]);
    setBoardOrientation('w');
  };

  // Last Move
  const lastMove = useMemo(() => {
    if (isPassAndPlay) {
      if (localHistory.length === 0) return null;
      const last = localHistory[localHistory.length - 1];
      return { from: last.from, to: last.to };
    }
    if (!currentRoom || currentRoom.history.length === 0) return null;
    const last = currentRoom.history[currentRoom.history.length - 1];
    return { from: last.from, to: last.to };
  }, [currentRoom?.history, isPassAndPlay, localHistory]);

  // Determine canMove
  const canMove = useMemo(() => {
    if (isPassAndPlay) {
      return !localChess.isGameOver();
    }
    if (!currentRoom) return false;
    if (currentRoom.status !== 'in_progress') return false;
    if (!yourColor) return false; // spectator
    return currentChess.turn() === yourColor;
  }, [currentRoom, yourColor, currentChess, isPassAndPlay, localChess]);

  // Turn announcement
  const turnDisplay = currentChess.turn() === 'w' ? 'White to move' : 'Black to move';

  // Opponent and Self Clocks setup
  const topPlayerColor: PieceColor = boardOrientation === 'w' ? 'b' : 'w';
  const bottomPlayerColor: PieceColor = boardOrientation === 'w' ? 'w' : 'b';

  const topPlayer =
    topPlayerColor === 'w' ? currentRoom?.whitePlayer : currentRoom?.blackPlayer;
  const bottomPlayer =
    bottomPlayerColor === 'w' ? currentRoom?.whitePlayer : currentRoom?.blackPlayer;

  // Draw offer alert
  const opponentDrawOffered =
    currentRoom?.status === 'in_progress' &&
    currentRoom?.drawOffer &&
    currentRoom.drawOffer !== yourColor;

  return (
    <div className="min-h-screen bg-[#111317] text-slate-100 flex flex-col font-sans selection:bg-amber-500/20">
      {/* Top Bar following Top Bar Contract (3 zones separated by gap-8) */}
      <header className="flex items-center justify-between gap-8 px-4 sm:px-8 py-3.5 border-b border-slate-800 bg-[#16191f]/90 backdrop-blur-md sticky top-0 z-40">
        {/* Zone 1: Single text element wordmark */}
        <button
          onClick={handleLeaveRoom}
          className="flex items-center gap-2.5 text-left group cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 shadow-md shadow-amber-900/30">
            <Crown className="w-5 h-5 fill-slate-950" />
          </div>
          <span className="text-base sm:text-lg font-bold font-sans tracking-tight text-slate-100 whitespace-nowrap shrink-0 group-hover:text-amber-300 transition-colors">
            Classic Chess Live
          </span>
        </button>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-400">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Create Match
          </button>
          <button
            onClick={startPassAndPlay}
            className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Local Pass & Play
          </button>
          <a
            href="https://en.wikipedia.org/wiki/Rules_of_chess"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
          >
            Chess Rules
          </a>
        </nav>

        {/* Zone 3: 1 Primary CTA button */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={toggleSound}
            title={soundOn ? 'Mute Sounds' : 'Unmute Sounds'}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-md shadow-amber-600/20 transition-all hover:scale-[1.02] whitespace-nowrap shrink-0 cursor-pointer"
          >
            New Game
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 lg:p-8 flex flex-col justify-center">
        {/* Error notification banner */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-rose-950/80 border border-rose-600/60 text-rose-300 text-xs rounded-xl flex items-center gap-2 max-w-md mx-auto shadow-lg animate-shake">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Opponent Draw Offer Alert Banner */}
        {opponentDrawOffered && (
          <div className="mb-4 p-3 bg-amber-950/80 border border-amber-500 text-amber-200 text-xs rounded-xl flex items-center justify-between gap-4 max-w-lg mx-auto shadow-lg animate-pulse">
            <div className="flex items-center gap-2">
              <Handshake className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Your opponent offers a draw. Do you accept?</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleAcceptDraw}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[11px] transition-colors"
              >
                Accept
              </button>
              <button
                onClick={handleDeclineDraw}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] transition-colors"
              >
                Decline
              </button>
            </div>
          </div>
        )}

        {/* View Routing: Either Active Room OR Lobby Landing */}
        {currentRoom || isPassAndPlay ? (
          /* ACTIVE MATCH VIEW */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left & Center: Board Column (Col 8) */}
            <div className="lg:col-span-8 flex flex-col items-center">
              {/* Top Player HUD (Opponent) */}
              <div className="w-[320px] sm:w-[440px] md:w-[500px] lg:w-[560px] mb-2 space-y-1">
                {currentRoom?.timeControl.initialMinutes ? (
                  <ChessClock
                    player={topPlayer || null}
                    color={topPlayerColor}
                    isActive={
                      currentRoom.status === 'in_progress' &&
                      currentRoom.activeTimerColor === topPlayerColor
                    }
                    timeLeftMs={topPlayer?.timeLeftMs || 0}
                    label={topPlayerColor === 'w' ? 'White' : 'Black'}
                  />
                ) : (
                  <div className="flex items-center justify-between px-3 py-1.5 bg-[#181b20] border border-slate-800 rounded-xl text-xs text-slate-300">
                    <span className="font-semibold">
                      {topPlayer?.name || (topPlayerColor === 'w' ? 'White' : 'Black')}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {topPlayerColor === 'w' ? 'White' : 'Black'}
                    </span>
                  </div>
                )}

                {/* Top Captured Pieces */}
                <div className="px-1">
                  <CapturedPieces
                    fen={currentChess.fen()}
                    capturedColor={topPlayerColor === 'w' ? 'b' : 'w'}
                  />
                </div>
              </div>

              {/* The Chess Board */}
              <ChessBoard
                chess={currentChess}
                orientation={boardOrientation}
                canMove={canMove}
                onMove={handleMove}
                lastMove={lastMove}
                theme={boardTheme}
              />

              {/* Bottom Player HUD (You / Bottom) */}
              <div className="w-[320px] sm:w-[440px] md:w-[500px] lg:w-[560px] mt-2 space-y-1">
                {/* Bottom Captured Pieces */}
                <div className="px-1">
                  <CapturedPieces
                    fen={currentChess.fen()}
                    capturedColor={bottomPlayerColor === 'w' ? 'b' : 'w'}
                  />
                </div>

                {currentRoom?.timeControl.initialMinutes ? (
                  <ChessClock
                    player={bottomPlayer || null}
                    color={bottomPlayerColor}
                    isActive={
                      currentRoom.status === 'in_progress' &&
                      currentRoom.activeTimerColor === bottomPlayerColor
                    }
                    timeLeftMs={bottomPlayer?.timeLeftMs || 0}
                    label={
                      bottomPlayerColor === yourColor
                        ? `${playerName} (You)`
                        : bottomPlayerColor === 'w'
                        ? 'White'
                        : 'Black'
                    }
                  />
                ) : (
                  <div className="flex items-center justify-between px-3 py-1.5 bg-[#181b20] border border-slate-800 rounded-xl text-xs text-slate-300">
                    <span className="font-semibold">
                      {bottomPlayer?.name || (bottomPlayerColor === 'w' ? 'White' : 'Black')}
                      {bottomPlayerColor === yourColor ? ' (You)' : ''}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {bottomPlayerColor === 'w' ? 'White' : 'Black'}
                    </span>
                  </div>
                )}
              </div>

              {/* Board Quick Toolbar */}
              <div className="w-[320px] sm:w-[440px] md:w-[500px] lg:w-[560px] mt-3 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setBoardOrientation((prev) => (prev === 'w' ? 'b' : 'w'))
                    }
                    title="Flip Board View"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Flip</span>
                  </button>

                  {/* Theme Selector */}
                  <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-xl border border-slate-700/60">
                    <button
                      onClick={() => setBoardTheme('classic-wood')}
                      title="Classic Wood Board"
                      className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors cursor-pointer ${
                        boardTheme === 'classic-wood'
                          ? 'bg-amber-600 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Wood
                    </button>
                    <button
                      onClick={() => setBoardTheme('tournament-green')}
                      title="Tournament Green Board"
                      className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors cursor-pointer ${
                        boardTheme === 'tournament-green'
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Green
                    </button>
                    <button
                      onClick={() => setBoardTheme('midnight-slate')}
                      title="Midnight Slate Board"
                      className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors cursor-pointer ${
                        boardTheme === 'midnight-slate'
                          ? 'bg-slate-600 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Slate
                    </button>
                  </div>
                </div>

                {/* Match Action Buttons */}
                {!isPassAndPlay && currentRoom?.status === 'in_progress' && yourColor && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleOfferDraw}
                      disabled={Boolean(currentRoom.drawOffer)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Handshake className="w-3.5 h-3.5" />
                      <span>Offer Draw</span>
                    </button>

                    <button
                      onClick={handleResign}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/50 text-rose-300 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Flag className="w-3.5 h-3.5" />
                      <span>Resign</span>
                    </button>
                  </div>
                )}

                {/* Share Link button if waiting or anytime */}
                {currentRoom && (
                  <button
                    onClick={() => setIsShareModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Invite Friend</span>
                  </button>
                )}
              </div>
            </div>

            {/* Right: History & Chat Sidebar (Col 4) */}
            <div className="lg:col-span-4 flex flex-col h-[520px] lg:h-[600px] space-y-3">
              {/* Room Code Banner & Status */}
              <div className="bg-[#181b20] border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {isPassAndPlay ? 'Pass & Play Mode' : 'Room Code:'}
                    </span>
                    {!isPassAndPlay && (
                      <span className="text-sm font-black font-mono text-amber-400 tracking-wider">
                        {currentRoom?.code}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-300 font-medium mt-0.5">
                    {turnDisplay}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isConnected ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                    title={isConnected ? 'Connected' : 'Connecting...'}
                  />
                  <span className="text-[11px] text-slate-400">
                    {isConnected ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>

              {/* Tab Selector */}
              <div className="flex bg-[#14161a] p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setActiveTab('moves')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    activeTab === 'moves'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Moves ({isPassAndPlay ? localHistory.length : currentRoom?.history.length || 0})
                </button>
                {!isPassAndPlay && (
                  <button
                    onClick={() => setActiveTab('chat')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                      activeTab === 'chat'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Chat ({currentRoom?.messages.length || 0})
                  </button>
                )}
              </div>

              {/* Tab Content */}
              <div className="flex-1 min-h-0">
                {activeTab === 'moves' ? (
                  <MoveHistory
                    history={isPassAndPlay ? localHistory : currentRoom?.history || []}
                    fen={currentChess.fen()}
                  />
                ) : (
                  <GameChat
                    messages={currentRoom?.messages || []}
                    onSendMessage={handleSendMessage}
                    yourColor={yourColor}
                    yourName={playerName}
                  />
                )}
              </div>
            </div>
          </div>
        ) : (
          /* LOBBY / LANDING VIEW */
          <div className="flex flex-col items-center justify-center py-6 sm:py-12 max-w-3xl mx-auto text-center">
            {/* Visual Header */}
            <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-6 shadow-xl shadow-amber-950/20">
              <Swords className="w-8 h-8" />
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-100 font-sans mb-3 text-balance">
              Play Classic Chess in Real Time
            </h1>
            <p className="text-sm sm:text-base text-slate-400 max-w-xl mb-8 leading-relaxed">
              Create a custom room, invite your friend with a shareable link, and enjoy clean, instant chess matches with live clocks, algebraic notation, and real-time chat.
            </p>

            {/* Quick Actions Grid */}
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 text-left">
              {/* Card 1: Create Game */}
              <div className="p-6 rounded-2xl bg-[#181b20] border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col justify-between group">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                    <Swords className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-100 mb-1">
                    Host a Private Match
                  </h3>
                  <p className="text-xs text-slate-400 mb-6">
                    Pick your preferred time control (Rapid, Blitz, Classical) and generate a shareable match invite for your friend.
                  </p>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-600/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] cursor-pointer"
                >
                  <span>Create Room</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Card 2: Join with Code */}
              <div className="p-6 rounded-2xl bg-[#181b20] border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mb-4">
                    <Users className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-100 mb-1">
                    Join with Room Code
                  </h3>
                  <p className="text-xs text-slate-400 mb-4">
                    Have a code from your friend? Enter it below to join their chess board instantly.
                  </p>
                  <input
                    type="text"
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                    placeholder="e.g. 7X9K2P"
                    maxLength={6}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono tracking-widest text-amber-300 placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors uppercase mb-3"
                  />
                </div>
                <button
                  onClick={() => handleJoinRoom(joinCodeInput)}
                  disabled={!joinCodeInput.trim()}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-100 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <span>Enter Match</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Pass and play secondary option */}
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span>Looking to practice solo or play on one screen?</span>
              <button
                onClick={startPassAndPlay}
                className="text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-4 cursor-pointer"
              >
                Launch Pass & Play Board
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 px-6 text-center text-xs text-slate-500 bg-[#14161a]">
        <span>Classic Chess Live · Real-Time Multiplayer · FIDE Standard Rules</span>
      </footer>

      {/* Modals */}
      <CreateGameModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateGame={handleCreateRoom}
        defaultPlayerName={playerName}
      />

      <ShareGameModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        roomCode={currentRoom?.code || ''}
      />

      {currentRoom && (
        <GameOverModal
          isOpen={currentRoom.isGameOver}
          status={currentRoom.status}
          winner={currentRoom.winner}
          whitePlayer={currentRoom.whitePlayer}
          blackPlayer={currentRoom.blackPlayer}
          yourColor={yourColor}
          rematchOffer={currentRoom.rematchOffer}
          onOfferRematch={handleOfferRematch}
          onNewGame={() => {
            handleLeaveRoom();
            setIsCreateModalOpen(true);
          }}
        />
      )}
    </div>
  );
}
