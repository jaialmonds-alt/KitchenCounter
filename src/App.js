import { useState, useEffect, useRef } from "react";

export default function PickleballScorebot() {
  const [mode, setMode] = useState(null);
  const [winRule, setWinRule] = useState("winBy2");
  // "winBy2" or "firstTo11"
  const [started, setStarted] = useState(false);

  // names
  const [teamAName, setTeamAName] = useState("Team A");
  const [teamBName, setTeamBName] = useState("Team B");

  // choose starting server
  const [startServer, setStartServer] = useState("A");

  const [score, setScore] = useState({ A: 0, B: 0 });
  const [server, setServer] = useState("A");
  const [serverNumber, setServerNumber] = useState(2);
  const [gameOver, setGameOver] = useState(false);
  const [gameOverAnnounced, setGameOverAnnounced] = useState(false); // ✅ ADD THIS
  const gamePointLock = useRef(false);
  const gameOverLock = useRef(false);
  const [history, setHistory] = useState([]);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);

  // 🔊 NEW AUDIO FUNCTION (Bluetooth-friendly)
  const speak = (text, interrupt = true) => {
    const speech = new SpeechSynthesisUtterance(text);

    if (selectedVoice) {
      speech.voice = selectedVoice;
    }

    speech.rate = 0.9;
    speech.pitch = 1;

    // only cancel if we WANT to interrupt
    if (interrupt) {
      // only cancel if something is already speaking
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
    }

    window.speechSynthesis.speak(speech);
  };

  const getCall = (sc, srv, srvNum) => {
    const servingScore = srv === "A" ? sc.A : sc.B;
    const receivingScore = srv === "A" ? sc.B : sc.A;

    if (mode === "singles") return `${servingScore} ${receivingScore}`;
    return `${servingScore} - ${receivingScore} - ${srvNum}`;
  };

  const startGame = (selectedMode) => {
    const initialServer = startServer;
    const initialServerNumber = selectedMode === "doubles" ? 2 : 1;

    setMode(selectedMode);
    setStarted(true);
    setScore({ A: 0, B: 0 });
    setServer(initialServer);
    setServerNumber(initialServerNumber);

    setTimeout(() => {
      speak(getCall({ A: 0, B: 0 }, initialServer, initialServerNumber));
    }, 300);
  };

  const checkGamePoint = (newScore) => {
    const { A, B } = newScore;

    if (winRule === "firstTo11") {
      if (A === 10) return "A";
      if (B === 10) return "B";
    }

    if (winRule === "winBy2") {
      if (A >= 10 && A - B === 1) return "A";
      if (B >= 10 && B - A === 1) return "B";
    }

    return null;
  };
  const scorePoint = (teamOverride = null) => {
    if (gameOver || gameOverAnnounced) return;

    // ❌ Prevent non-serving team from scoring
    if (teamOverride && teamOverride !== server) {
      speak("You must be serving to score.");
      return;
    }

    const teamToScore = server;

    setScore((prev) => {
      setHistory((h) => [...h, { score: prev, server, serverNumber }]);

      const updated = { ...prev };
      updated[teamToScore] += 1;

      const { A, B } = updated;

      // ✅ STEP 1: CHECK WIN FIRST
      let winner = null;

      if (winRule === "firstTo11") {
        if (A >= 11) winner = "A";
        if (B >= 11) winner = "B";
      }

      if (winRule === "winBy2") {
        if ((A >= 11 || B >= 11) && Math.abs(A - B) >= 2) {
          winner = A > B ? "A" : "B";
        }
      }

      // 🏁 IF WIN → STOP EVERYTHING
      if (winner && !gameOverLock.current) {
        gameOverLock.current = true; // 🔒 LOCK immediately

        setGameOver(true);
        setGameOverAnnounced(true);

        const winnerName = winner === "A" ? teamAName : teamBName;

        // 1. Speak final score
        speak(getCall(updated, server, serverNumber), true);

        // 2. Then say game over
        setTimeout(() => {
          speak(`Game over. ${winnerName} wins`, false);
        }, 1000);

        return updated;
      }

      // ✅ STEP 2: GAME POINT (only if no winner)
      const gamePointTeam = checkGamePoint(updated);

      if (gamePointTeam && !gamePointLock.current) {
        gamePointLock.current = true; // 🔒 LOCK

        const name = gamePointTeam === "A" ? teamAName : teamBName;

        // speak game point FIRST
        speak(`${name} game point`, true);

        // then score
        setTimeout(() => {
          speak(getCall(updated, server, serverNumber), false);
        }, 900);
      } else if (!gamePointTeam) {
        // 🔓 UNLOCK when no longer in game point
        gamePointLock.current = false;

        speak(getCall(updated, server, serverNumber), true);
      }

      return updated;
    });
  };

  const fault = () => {
    if (gameOver) return;

    if (mode === "singles") {
      const nextServer = server === "A" ? "B" : "A";
      setServer(nextServer);

      setTimeout(() => {
        speak("Side out");
        setTimeout(() => speak(getCall(score, nextServer, 1)), 700);
      }, 0);
      return;
    }

    if (serverNumber === 1) {
      setServerNumber(2);
      setTimeout(() => speak(getCall(score, server, 2)), 0);
    } else {
      const nextServer = server === "A" ? "B" : "A";

      speak("Side out");

      setTimeout(() => {
        setServer(nextServer);
        setServerNumber(1);

        setTimeout(() => {
          speak(getCall(score, nextServer, 1));
        }, 300);
      }, 700);
    }
  };
  const undo = () => {
    if (history.length === 0) return;

    const prev = history[history.length - 1];

    setScore(prev.score);
    setServer(prev.server);
    setServerNumber(prev.serverNumber);
    setHistory(history.slice(0, -1));
    setGameOver(false);
  };
  const newGame = () => {
    setStarted(false);
    setGameOver(false);
    setGameOverAnnounced(false);
    gameOverLock.current = false; // ✅ RESET LOCK
    setScore({ A: 0, B: 0 });
    setServer("A");
    setServerNumber(2);
  };
  const resetGame = () => {
    setScore({ A: 0, B: 0 });
    setServer(startServer);
    setServerNumber(mode === "doubles" ? 2 : 1);
    setGameOver(false);
    setGameOverAnnounced(false);
    gameOverLock.current = false; // ✅ RESET LOCK

    setTimeout(() => {
      speak(getCall({ A: 0, B: 0 }, startServer, mode === "doubles" ? 2 : 1));
    }, 300);
  };
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!started) return;

      if (e.key === "MediaPlayPause" || e.code === "Space") scorePoint();
      if (e.key === "MediaTrackNext" || e.code === "ArrowRight") fault();
      if (e.key === "MediaTrackPrevious" || e.code === "ArrowLeft")
        speak(getCall(score, server, serverNumber));
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [score, server, serverNumber, started]);

  useEffect(() => {
    const loadVoices = () => {
      const voicesList = window.speechSynthesis.getVoices();
      if (voicesList.length > 0) {
        setVoices(voicesList);
        if (!selectedVoice) setSelectedVoice(voicesList[0]);
      }
    };

    loadVoices();

    window.speechSynthesis.onvoiceschanged = loadVoices;

    // 🔥 fallback (important)
    setTimeout(loadVoices, 500);
  }, [selectedVoice]);

  // SETUP SCREEN
  if (!started) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          {/* TITLE */}
          <h1 style={{ marginBottom: 5, fontSize: 32 }}>The Kitchen Counter</h1>
          <p style={{ marginTop: 0, marginBottom: 20, color: "#9ca3af" }}>
            Pickleball Scorekeeper
          </p>

          {/* TEAM NAMES */}
          <div style={{ marginBottom: 20, textAlign: "left" }}>
            <p style={{ marginBottom: 6, fontWeight: "bold" }}>Teams</p>

            <input
              placeholder="Team A"
              value={teamAName}
              onChange={(e) => setTeamAName(e.target.value)}
              style={styles.input}
            />

            <input
              placeholder="Team B"
              value={teamBName}
              onChange={(e) => setTeamBName(e.target.value)}
              style={styles.input}
            />
          </div>

          {/* STARTING SERVER */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontWeight: "bold", marginBottom: 8 }}>
              Who serves first?
            </p>

            <div style={{ display: "flex", gap: 10 }}>
              <div
                onClick={() => setStartServer("A")}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 14,
                  background:
                    startServer === "A" ? "#3b82f6" : "rgba(255,255,255,0.05)",
                  cursor: "pointer",
                  border:
                    startServer === "A"
                      ? "2px solid #60a5fa"
                      : "1px solid rgba(255,255,255,0.1)",
                }}
              >
                {teamAName}
              </div>

              <div
                onClick={() => setStartServer("B")}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 14,
                  background:
                    startServer === "B" ? "#ef4444" : "rgba(255,255,255,0.05)",
                  cursor: "pointer",
                  border:
                    startServer === "B"
                      ? "2px solid #f87171"
                      : "1px solid rgba(255,255,255,0.1)",
                }}
              >
                {teamBName}
              </div>
            </div>
          </div>

          {/* MATCH TYPE */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontWeight: "bold", marginBottom: 8 }}>Match Type</p>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setMode("singles")}
                style={{
                  ...styles.selectButton,
                  background: mode === "singles" ? "#22c55e" : "#1f2937",
                }}
              >
                Singles
              </button>

              <button
                onClick={() => setMode("doubles")}
                style={{
                  ...styles.selectButton,
                  background: mode === "doubles" ? "#22c55e" : "#1f2937",
                }}
              >
                Doubles
              </button>
            </div>
          </div>

          {/* WIN RULE */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontWeight: "bold", marginBottom: 8 }}>Win Rule</p>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setWinRule("firstTo11")}
                style={{
                  ...styles.selectButton,
                  background: winRule === "firstTo11" ? "#22c55e" : "#1f2937",
                }}
              >
                First to 11
              </button>

              <button
                onClick={() => setWinRule("winBy2")}
                style={{
                  ...styles.selectButton,
                  background: winRule === "winBy2" ? "#22c55e" : "#1f2937",
                }}
              >
                Win by 2
              </button>
            </div>
          </div>

          {/* START BUTTON */}
          <button
            onClick={() => startGame(mode || "doubles")}
            style={{
              width: "100%",
              padding: 16,
              borderRadius: 16,
              fontSize: 18,
              fontWeight: "bold",
              background: "linear-gradient(135deg, #22c55e, #16a34a)",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 10px 25px rgba(34,197,94,0.5)",
            }}
          >
            ▶ Start Game
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1>Pickleball Scorebot</h1>

        {/* MAIN SCORE DISPLAY */}
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 48,
              fontWeight: "bold",
              boxShadow: "0 0 20px rgba(34,197,94,0.5)",
              color: "#22c55e",
              padding: "16px 24px",
              borderRadius: 16,
              display: "inline-block",
              letterSpacing: 2,
            }}
          >
            {getCall(score, server, serverNumber)}
          </div>
        </div>

        {/* DETAILED SCORE */}
        <div style={{ marginBottom: 20, textAlign: "left" }}>
          <div style={{ fontSize: 20, marginBottom: 6 }}>
            <strong>{teamAName}</strong>: {score.A}
            {server === "A" && " 🔵 Serving"}
          </div>

          <div style={{ fontSize: 18 }}>
            <strong>{teamBName}</strong>: {score.B}
            {server === "B" && " 🔵 Serving"}
          </div>

          {mode === "doubles" && (
            <div style={{ fontSize: 16, marginTop: 8 }}>
              Server Number: {serverNumber}
            </div>
          )}
        </div>

        <p>Serving: {server === "A" ? teamAName : teamBName}</p>

        <div style={{ marginBottom: 10 }}>
          <strong>{teamAName}</strong> vs <strong>{teamBName}</strong>
        </div>

        <div style={{ marginTop: 20 }}>
          {/* TEAM BUTTONS */}
          <div style={{ display: "flex", gap: 12 }}>
            <div
              style={{
                flex: 1,
                background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                padding: server === "A" ? 40 : 35,
                borderRadius: 20,
                fontSize: 28,
                fontWeight: "bold",
                textAlign: "center",
                color: "white",

                // ✅ ADD THESE TWO LINES
                opacity: server === "A" ? 1 : 0.5,
                cursor: server === "A" ? "pointer" : "not-allowed",

                boxShadow:
                  server === "A"
                    ? "0 0 25px rgba(59,130,246,0.9)"
                    : "0 6px 15px rgba(0,0,0,0.4)",
                transform: server === "A" ? "scale(1.05)" : "scale(1)",
                transition: "all 0.2s ease",
              }}
              // ✅ UPDATE THIS
              onClick={() => server === "A" && scorePoint("A")}
            >
              {teamAName}
            </div>

            <div
              style={{
                flex: 1,
                background: "linear-gradient(135deg, #ef4444, #b91c1c)",
                padding: server === "B" ? 40 : 35,
                borderRadius: 20,
                fontSize: 28,
                fontWeight: "bold",
                textAlign: "center",
                color: "white",

                // ✅ ADD THESE
                opacity: server === "B" ? 1 : 0.5,
                cursor: server === "B" ? "pointer" : "not-allowed",

                boxShadow:
                  server === "B"
                    ? "0 0 25px rgba(239,68,68,0.9)"
                    : "0 6px 15px rgba(0,0,0,0.4)",
                transform: server === "B" ? "scale(1.05)" : "scale(1)",
                transition: "all 0.2s ease",
              }}
              // ✅ UPDATE THIS
              onClick={() => server === "B" && scorePoint("B")}
            >
              {teamBName}
            </div>
          </div>

          {/* FAULT BUTTON */}
          <button
            onClick={fault}
            style={{
              width: "100%",
              marginTop: 14,
              padding: 18,
              borderRadius: 18,
              fontSize: 18,
              fontWeight: "bold",
              background: "#f59e0b",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            }}
          >
            ⚠️ Fault / Side Out
          </button>

          {/* CONTROL BUTTONS */}
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button
              onClick={() => speak(getCall(score, server, serverNumber))}
              style={{
                flex: 1,
                padding: 14,
                borderRadius: 14,
                background: "#1f2937",
                color: "white",
                border: "none",
                cursor: "pointer",
              }}
            >
              🔊 Call
            </button>

            <button
              onClick={undo}
              style={{
                flex: 1,
                padding: 14,
                borderRadius: 14,
                background: "#374151",
                color: "white",
                border: "none",
                cursor: "pointer",
              }}
            >
              Undo
            </button>

            <button
              onClick={resetGame}
              style={{
                flex: 1,
                padding: 14,
                borderRadius: 14,
                background: "#ef4444",
                color: "white",
                border: "none",
                cursor: "pointer",
              }}
            >
              Reset
            </button>
          </div>
        </div>
        <button
          onClick={newGame}
          style={{
            width: "100%",
            marginTop: 10,
            padding: 14,
            borderRadius: 14,
            background: "#6366f1",
            color: "white",
            border: "none",
            cursor: "pointer",
          }}
        >
          New Game
        </button>

        {gameOver && <p>Winner: {score.A > score.B ? teamAName : teamBName}</p>}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "radial-gradient(circle at top, #1e293b, #020617)",
    color: "white",
    fontFamily: "Helvetica",
  },

  card: {
    background: "linear-gradient(145deg, #111827, #020617)",
    padding: 30,
    borderRadius: 24,
    width: 380,
    textAlign: "center",
    boxShadow: "0 25px 70px rgba(0,0,0,0.9)",
    border: "1px solid rgba(255,255,255,0.05)",
  },

  input: {
    width: "100%",
    padding: 8,
    marginBottom: 10,
    borderRadius: 8,
    border: "1px solid #ccc",
  },

  selectButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    border: "none",
    background: "#1f2937",
    color: "white",
    cursor: "pointer",
    fontWeight: "bold",
  },

  // 🔥 THIS IS YOUR 3D BUTTON STYLE
  button3D: {
    padding: 14,
    borderRadius: 14,
    border: "none",
    fontWeight: "bold",
    cursor: "pointer",

    background: "linear-gradient(145deg, #1f2937, #111827)",

    boxShadow:
      "6px 6px 12px rgba(0,0,0,0.6), -4px -4px 10px rgba(255,255,255,0.05)",

    transition: "all 0.15s ease",
  },
};

