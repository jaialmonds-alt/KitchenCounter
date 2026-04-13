import { useState, useEffect, useRef } from "react";

export default function PickleballScorebot() {
  const [mode, setMode] = useState(null);
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

  const speakingRef = useRef(false);
  const voicesRef = useRef([]);

  useEffect(() => {
    const loadVoices = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  const getFemaleVoice = () => {
    const voices = voicesRef.current;
    return (
      voices.find((v) => v.name.toLowerCase().includes("samantha")) ||
      voices.find((v) => v.name.toLowerCase().includes("female")) ||
      voices[0]
    );
  };

  const speak = (text) => {
    if (speakingRef.current) return;
    speakingRef.current = true;

    const speech = new SpeechSynthesisUtterance(text);
    speech.rate = 0.85;
    speech.voice = getFemaleVoice();

    speech.onend = () => (speakingRef.current = false);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(speech);
  };

  const getCall = (sc, srv, srvNum) => {
    const servingScore = srv === "A" ? sc.A : sc.B;
    const receivingScore = srv === "A" ? sc.B : sc.A;

    if (mode === "singles") return `${servingScore} - ${receivingScore}`;
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

  const checkWin = (newScore) => {
    const { A, B } = newScore;
    if ((A >= 11 || B >= 11) && Math.abs(A - B) >= 2) {
      setGameOver(true);
    }
  };

  const scorePoint = () => {
    if (gameOver) return;

    setScore((prev) => {
      const updated = { ...prev };
      updated[server] += 1;
      checkWin(updated);

      setTimeout(() => speak(getCall(updated, server, serverNumber)), 0);
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

  const resetGame = () => {
    setScore({ A: 0, B: 0 });
    setServer(startServer);
    setServerNumber(mode === "doubles" ? 2 : 1);
    setGameOver(false);

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

  // SETUP SCREEN
  if (!started) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1>Pickleball Scorebot</h1>

          {/* MAIN SCORE DISPLAY */}
          <div
            style={{
              fontSize: 32,
              fontWeight: "bold",
              background: "#111",
              color: "#fff",
              padding: "10px 16px",
              borderRadius: 12,
              display: "inline-block",
              marginBottom: 20,
            }}
          >
            {getCall(score, server, serverNumber)}
          </div>
          <p>Enter Team Names:</p>
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

          <p>Select Starting Server:</p>
          <button onClick={() => setStartServer("A")}>
            {teamAName} serves
          </button>
          <button onClick={() => setStartServer("B")}>
            {teamBName} serves
          </button>

          <p style={{ marginTop: 10 }}>
            Selected: {startServer === "A" ? teamAName : teamBName}
          </p>

          <p>Select Match Type:</p>
          <button onClick={() => startGame("singles")}>Singles</button>
          <button onClick={() => startGame("doubles")}>Doubles</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1>Pickleball Scorebot</h1>

        {/* CURRENT CALL (MAIN DISPLAY) */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 28, fontWeight: "bold" }}>
            {getCall(score, server, serverNumber)}
          </div>
          <div style={{ fontSize: 14, color: "#555" }}>Current Call</div>
        </div>

        {/* DETAILED SCORE */}
        <div style={{ marginBottom: 20, textAlign: "left" }}>
          <div style={{ fontSize: 18 }}>
            <strong>{teamAName}</strong>: {score.A}
            {server === "A" && " (Serving)"}
          </div>

          <div style={{ fontSize: 18 }}>
            <strong>{teamBName}</strong>: {score.B}
            {server === "B" && " (Serving)"}
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

        <button onClick={scorePoint}>Point</button>
        <button onClick={fault}>Fault / Side Out</button>
        <button onClick={() => speak(getCall(score, server, serverNumber))}>
          🔊 Call
        </button>
        <button onClick={resetGame}>Reset</button>

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
    background: "#f3f4f6",
    fontFamily: "Arial",
  },
  card: {
    background: "white",
    padding: 20,
    borderRadius: 16,
    width: 320,
    textAlign: "center",
  },
  input: {
    width: "100%",
    padding: 8,
    marginBottom: 10,
    borderRadius: 8,
    border: "1px solid #ccc",
  },
};
