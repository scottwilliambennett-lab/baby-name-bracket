import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { collection, addDoc, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import './App.css';

function App() {
  const [view, setView] = useState('home');
  const [user, setUser] = useState(null);
  const [authView, setAuthView] = useState('login'); // 'login' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [gameId, setGameId] = useState('');
  const [loadGameId, setLoadGameId] = useState('');
  const [joinGameId, setJoinGameId] = useState('');
  const [scoreboardGameId, setScoreboardGameId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [bracketSize, setBracketSize] = useState(32);
  const [names, setNames] = useState(Array(32).fill(''));
  const [bracket, setBracket] = useState({});
  const [currentRound, setCurrentRound] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const [tournamentDocId, setTournamentDocId] = useState('');
  const [predictions, setPredictions] = useState([]);
  const [masterBracket, setMasterBracket] = useState({});

  const getRoundsForSize = (size) => {
    if (size === 8) {
      return [
        { num: 1, name: 'Quarterfinals', games: 4 },
        { num: 2, name: 'Semifinals', games: 2 },
        { num: 3, name: 'Finals', games: 1 }
      ];
    } else if (size === 16) {
      return [
        { num: 1, name: 'Round of 16', games: 8 },
        { num: 2, name: 'Quarterfinals', games: 4 },
        { num: 3, name: 'Semifinals', games: 2 },
        { num: 4, name: 'Finals', games: 1 }
      ];
    } else {
      return [
        { num: 1, name: 'Round of 32', games: 16 },
        { num: 2, name: 'Sweet 16', games: 8 },
        { num: 3, name: 'Elite 8', games: 4 },
        { num: 4, name: 'Final Four', games: 2 },
        { num: 5, name: 'Championship', games: 1 }
      ];
    }
  };

  const rounds = getRoundsForSize(bracketSize);
  const maxRound = rounds.length;

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser && view !== 'auth') {
        setView('auth');
      }
    });
    return () => unsubscribe();
  }, [view]);

  const handleSignUp = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      setEmail('');
      setPassword('');
      setView('home');
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setEmail('');
      setPassword('');
      setView('home');
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setView('auth');
      // Reset all state
      setNames(Array(32).fill(''));
      setBracket({});
      setCurrentRound(1);
      setIsEditing(false);
      setIsPredicting(false);
      setGameId('');
    } catch (error) {
      alert('Error logging out');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert(`Copied: ${text}`);
    }).catch(() => {
      alert('Could not copy. Please copy manually: ' + text);
    });
  };

  const selectBracketSize = (size) => {
    setBracketSize(size);
    setNames(Array(size).fill(''));
    setView('enter-names');
  };

  const createTournament = () => {
    const newGameId = Math.random().toString(36).substring(2, 9).toUpperCase();
    setGameId(newGameId);
    setIsEditing(false);
    setIsPredicting(false);
    setView('select-size');
  };

  const joinTournament = async () => {
    if (!joinGameId.trim()) {
      alert('Please enter a Game ID');
      return;
    }

    if (!playerName.trim()) {
      alert('Please enter your name');
      return;
    }

    try {
      const q = query(collection(db, 'games'), where('gameId', '==', joinGameId.toUpperCase()));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        alert('Tournament not found! Check your Game ID.');
        return;
      }

      const tournamentDoc = querySnapshot.docs[0];
      const data = tournamentDoc.data();
      
      setGameId(data.gameId);
      setNames(data.names);
      setBracketSize(data.bracketSize || data.names.length);
      setBracket({});
      setIsPredicting(true);
      setIsEditing(false);
      setCurrentRound(1);
      setView('create-bracket');
      
    } catch (error) {
      console.error('Error loading tournament:', error);
      alert('Error loading tournament!');
    }
  };

  const loadTournament = async () => {
    if (!loadGameId.trim()) {
      alert('Please enter a Game ID');
      return;
    }

    try {
      const q = query(collection(db, 'games'), where('gameId', '==', loadGameId.toUpperCase()));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        alert('Tournament not found! Check your Game ID.');
        return;
      }

      const tournamentDoc = querySnapshot.docs[0];
      const data = tournamentDoc.data();
      
      setGameId(data.gameId);
      setNames(data.names);
      setBracket(data.bracket);
      setBracketSize(data.bracketSize || data.names.length);
      setTournamentDocId(tournamentDoc.id);
      setIsEditing(true);
      setIsPredicting(false);
      setCurrentRound(1);
      setView('view-bracket');
      
    } catch (error) {
      console.error('Error loading tournament:', error);
      alert('Error loading tournament!');
    }
  };

  const loadScoreboard = async () => {
    if (!scoreboardGameId.trim()) {
      alert('Please enter a Game ID');
      return;
    }

    try {
      // Load master bracket
      const gameQuery = query(collection(db, 'games'), where('gameId', '==', scoreboardGameId.toUpperCase()));
      const gameSnapshot = await getDocs(gameQuery);
      
      if (gameSnapshot.empty) {
        alert('Tournament not found! Check your Game ID.');
        return;
      }

      const gameData = gameSnapshot.docs[0].data();
      setMasterBracket(gameData.bracket);
      setNames(gameData.names);
      setBracketSize(gameData.bracketSize || gameData.names.length);
      setGameId(gameData.gameId);

      // Load all predictions
      const predQuery = query(collection(db, 'predictions'), where('gameId', '==', scoreboardGameId.toUpperCase()));
      const predSnapshot = await getDocs(predQuery);
      
      const allPredictions = predSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setPredictions(allPredictions);
      setView('scoreboard');
      
    } catch (error) {
      console.error('Error loading scoreboard:', error);
      alert('Error loading scoreboard!');
    }
  };

  const calculateScore = (predictionBracket, masterBracket) => {
    let score = 0;
    const rounds = getRoundsForSize(bracketSize);
    
    rounds.forEach((round, idx) => {
      const pointsPerGame = idx + 1; // Round 1 = 1 point, Round 2 = 2 points, etc.
      
      for (let game = 0; game < round.games; game++) {
        const key = `${round.num}-${game}`;
        if (predictionBracket[key] && predictionBracket[key] === masterBracket[key]) {
          score += pointsPerGame;
        }
      }
    });
    
    return score;
  };

  const handleNameChange = (index, value) => {
    const newNames = [...names];
    newNames[index] = value;
    setNames(newNames);
  };

  const startBracket = () => {
    const filledNames = names.filter(n => n.trim()).length;
    
    if (filledNames !== bracketSize) {
      alert(`Please enter all ${bracketSize} names! You have ${filledNames}/${bracketSize}`);
      return;
    }

    setCurrentRound(1);
    setView('create-bracket');
  };

  const getMatchup = (round, game) => {
    if (round === 1) {
      const idx1 = game * 2;
      const idx2 = game * 2 + 1;
      return [names[idx1], names[idx2]];
    } else {
      const prevRound = round - 1;
      const prevGame1 = game * 2;
      const prevGame2 = game * 2 + 1;
      return [
        bracket[`${prevRound}-${prevGame1}`],
        bracket[`${prevRound}-${prevGame2}`]
      ];
    }
  };

  const selectWinner = (round, game, winner) => {
    const newBracket = { ...bracket };
    newBracket[`${round}-${game}`] = winner;
    
    // Clear any future rounds that depended on this matchup
    for (let r = round + 1; r <= maxRound; r++) {
      const roundInfo = rounds.find(rd => rd.num === r);
      if (!roundInfo) continue;
      
      for (let g = 0; g < roundInfo.games; g++) {
        const key = `${r}-${g}`;
        if (bracket[key]) {
          delete newBracket[key];
        }
      }
    }
    
    setBracket(newBracket);
  };

  const canAdvance = () => {
    const gamesInRound = rounds[currentRound - 1].games;
    const completed = Object.keys(bracket).filter(k => 
      k.startsWith(`${currentRound}-`) && bracket[k]
    ).length;
    return completed === gamesInRound;
  };

  const nextRound = () => {
    if (currentRound < maxRound) {
      setCurrentRound(currentRound + 1);
    }
  };

  const saveBracket = async () => {
    if (!canAdvance()) {
      alert('Please complete all matchups!');
      return;
    }

    const finalKey = `${maxRound}-0`;
    
    // Confirmation dialogs
    let confirmMessage = '';
    if (isPredicting) {
      confirmMessage = `Save your predictions as ${playerName}?\n\nYour predicted winner: ${bracket[finalKey]}\n\nYou can't change these after saving!`;
    } else if (isEditing && tournamentDocId) {
      confirmMessage = `Update your master bracket?\n\nNew winning name: ${bracket[finalKey]}\n\nThis will replace your previous choices!`;
    } else {
      confirmMessage = `Save your master bracket?\n\nWinning name: ${bracket[finalKey]}\n\nYou can edit this later using the Game ID: ${gameId}`;
    }

    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) {
      return;
    }

    try {
      if (isPredicting) {
        // Save friend's prediction
        await addDoc(collection(db, 'predictions'), {
          gameId: gameId,
          playerName: playerName,
          bracket: bracket,
          predictedWinner: bracket[finalKey],
          bracketSize: bracketSize,
          createdAt: new Date().toISOString()
        });
        
        const winner = bracket[finalKey];
        alert(`Predictions saved! Game ID: ${gameId}\nYour predicted winner: ${winner}\n\nPlayer: ${playerName}`);
        
      } else if (isEditing && tournamentDocId) {
        // Update existing tournament
        const docRef = doc(db, 'games', tournamentDocId);
        await updateDoc(docRef, {
          names: names,
          bracket: bracket,
          bracketSize: bracketSize,
          updatedAt: new Date().toISOString()
        });
        
        const winner = bracket[finalKey];
        alert(`Tournament updated! Game ID: ${gameId}\nWinning name: ${winner}`);
        
      } else {
        // Create new tournament
        await addDoc(collection(db, 'games'), {
          gameId: gameId,
          userId: user?.uid || null,
          userEmail: user?.email || null,
          names: names,
          bracket: bracket,
          bracketSize: bracketSize,
          createdAt: new Date().toISOString()
        });
        
        const winner = bracket[finalKey];
        alert(`Tournament saved! Game ID: ${gameId}\nWinning name: ${winner}\n\nSave this ID to edit later or share with friends!`);
      }
      
      setView('home');
      
      // Reset
      setNames(Array(32).fill(''));
      setBracket({});
      setCurrentRound(1);
      setIsEditing(false);
      setIsPredicting(false);
      setTournamentDocId('');
      setLoadGameId('');
      setJoinGameId('');
      setPlayerName('');
      setBracketSize(32);
      
    } catch (error) {
      console.error('Error:', error);
      alert('Error saving!');
    }
  };

  const editBracket = () => {
    const confirmed = window.confirm(
      'Edit your master bracket?\n\nYou can change any of your picks. Changes will need to be saved.'
    );
    if (confirmed) {
      setView('create-bracket');
      setCurrentRound(1);
    }
  };

  const viewPredictions = async () => {
    try {
      const predQuery = query(collection(db, 'predictions'), where('gameId', '==', gameId));
      const predSnapshot = await getDocs(predQuery);
      
      const allPredictions = predSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      if (allPredictions.length === 0) {
        alert('No predictions yet! Share your Game ID with friends.');
        return;
      }

      setPredictions(allPredictions);
      setMasterBracket(bracket);
      setView('view-predictions');
      
    } catch (error) {
      console.error('Error loading predictions:', error);
      alert('Error loading predictions!');
    }
  };

  const hasUnsavedWork = () => {
    return Object.keys(bracket).length > 0 || names.some(n => n.trim());
  };

  const goBackWithConfirmation = (targetView) => {
    if (hasUnsavedWork() && (view === 'create-bracket' || view === 'enter-names')) {
      const confirmed = window.confirm(
        'You have unsaved work! Are you sure you want to go back?\n\nAll your current picks will be lost.'
      );
      if (!confirmed) {
        return;
      }
    }
    
    // Reset everything
    setNames(Array(32).fill(''));
    setBracket({});
    setCurrentRound(1);
    setIsEditing(false);
    setIsPredicting(false);
    setTournamentDocId('');
    setLoadGameId('');
    setJoinGameId('');
    setPlayerName('');
    setBracketSize(32);
    setView(targetView);
  };

  return (
    <div className="App">
      <header className="App-header">
        {view === 'auth' && (
          <div style={{ maxWidth: '400px', width: '100%', padding: '20px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
              👶 🏆 👧
            </div>
            <h1>Baby Name Bracket</h1>
            <p style={{ color: '#888', marginBottom: '30px' }}>
              {authView === 'login' ? 'Welcome back!' : 'Create your account'}
            </p>

            <form onSubmit={authView === 'login' ? handleLogin : handleSignUp} style={{ width: '100%' }}>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  ...inputStyle,
                  marginBottom: '15px',
                  width: '100%'
                }}
              />
              <input
                type="password"
                placeholder="Password (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                style={{
                  ...inputStyle,
                  marginBottom: '15px',
                  width: '100%'
                }}
              />

              {authError && (
                <p style={{ color: '#f44336', fontSize: '0.9rem', marginBottom: '15px' }}>
                  {authError}
                </p>
              )}

              <button type="submit" style={{ ...buttonStyle, width: '100%', marginBottom: '15px' }}>
                {authView === 'login' ? '🔓 Log In' : '✨ Sign Up'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthView(authView === 'login' ? 'signup' : 'login');
                  setAuthError('');
                }}
                style={{
                  ...buttonStyle,
                  width: '100%',
                  backgroundColor: '#666'
                }}
              >
                {authView === 'login' ? "Don't have an account? Sign Up" : 'Already have an account? Log In'}
              </button>
            </form>
          </div>
        )}

        {view === 'home' && user && (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
              👶 🏆 👧
            </div>
            <h1>Baby Name Bracket</h1>
            <p>The Ultimate Name Reveal Game</p>
            
            {user && (
              <div style={{ 
                marginTop: '1rem',
                padding: '10px 20px',
                background: '#2d2d2d',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '10px',
                maxWidth: '400px',
                width: '100%'
              }}>
                <span style={{ color: '#888', fontSize: '0.9rem' }}>
                  👤 {user.email}
                </span>
                <button 
                  onClick={handleLogout}
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.8rem',
                    backgroundColor: '#d32f2f',
                    border: 'none',
                    borderRadius: '5px',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Logout
                </button>
              </div>
            )}
            
            <div style={{ 
              marginTop: '2rem', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '1.5rem', 
              width: '100%',
              maxWidth: '400px',
              padding: '0 20px'
            }}>
              {/* Create New Tournament */}
              <button onClick={createTournament} style={buttonStyle}>
                ➕ Create New Tournament
              </button>
              
              {/* Join & Make Predictions */}
              <div style={{ 
                padding: '20px', 
                background: '#2d2d2d', 
                borderRadius: '10px',
                border: '2px solid #764abc'
              }}>
                <p style={{ color: '#888', fontSize: '14px', marginBottom: '10px', fontWeight: 'bold' }}>
                  👥 Join & Make Predictions
                </p>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Your Name"
                  style={{...inputStyle, width: '100%', marginBottom: '10px'}}
                />
                <input
                  type="text"
                  value={joinGameId}
                  onChange={(e) => setJoinGameId(e.target.value)}
                  placeholder="Enter Game ID"
                  style={{...inputStyle, width: '100%', marginBottom: '10px'}}
                />
                <button onClick={joinTournament} style={{...buttonStyle, width: '100%'}}>
                  Join Tournament
                </button>
              </div>
              
              {/* Continue as Parents */}
              <div style={{ 
                padding: '20px', 
                background: '#2d2d2d', 
                borderRadius: '10px',
                border: '2px solid #FF9800'
              }}>
                <p style={{ color: '#888', fontSize: '14px', marginBottom: '10px', fontWeight: 'bold' }}>
                  👑 Continue as Parents
                </p>
                <input
                  type="text"
                  value={loadGameId}
                  onChange={(e) => setLoadGameId(e.target.value)}
                  placeholder="Enter Game ID"
                  style={{...inputStyle, width: '100%', marginBottom: '10px'}}
                />
                <button onClick={loadTournament} style={{...buttonStyle, width: '100%', backgroundColor: '#FF9800'}}>
                  Load My Tournament
                </button>
              </div>

              {/* View Scoreboard */}
              <div style={{ 
                padding: '20px', 
                background: '#2d2d2d', 
                borderRadius: '10px',
                border: '2px solid #4CAF50'
              }}>
                <p style={{ color: '#888', fontSize: '14px', marginBottom: '10px', fontWeight: 'bold' }}>
                  📊 View Scoreboard
                </p>
                <input
                  type="text"
                  value={scoreboardGameId}
                  onChange={(e) => setScoreboardGameId(e.target.value)}
                  placeholder="Enter Game ID"
                  style={{...inputStyle, width: '100%', marginBottom: '10px'}}
                />
                <button onClick={loadScoreboard} style={{...buttonStyle, width: '100%', backgroundColor: '#4CAF50'}}>
                  View Leaderboard
                </button>
              </div>
            </div>
          </>
        )}

        {view === 'select-size' && (
          <div style={{ maxWidth: '600px', width: '100%', padding: '20px' }}>
            <h2 style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)' }}>Choose Bracket Size</h2>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '30px' }}>
              <p style={{ color: '#888', margin: 0, fontSize: 'clamp(0.9rem, 3vw, 1rem)' }}>Game ID: {gameId}</p>
              <button 
                onClick={() => copyToClipboard(gameId)} 
                style={{
                  padding: '8px 15px',
                  fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)',
                  backgroundColor: '#4CAF50',
                  border: 'none',
                  borderRadius: '5px',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                📋 Copy
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <button 
                onClick={() => selectBracketSize(8)} 
                style={{...sizeButtonStyle}}
              >
                <div style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', marginBottom: '10px' }}>🎯</div>
                <div style={{ fontSize: 'clamp(1.2rem, 4vw, 1.5rem)', fontWeight: 'bold' }}>8 Names</div>
                <div style={{ fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)', color: '#888' }}>Quick Game • 3 Rounds</div>
                <div style={{ fontSize: 'clamp(0.7rem, 2vw, 0.8rem)', color: '#aaa', marginTop: '5px' }}>Quarterfinals → Semifinals → Finals</div>
              </button>

              <button 
                onClick={() => selectBracketSize(16)} 
                style={{...sizeButtonStyle}}
              >
                <div style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', marginBottom: '10px' }}>🏀</div>
                <div style={{ fontSize: 'clamp(1.2rem, 4vw, 1.5rem)', fontWeight: 'bold' }}>16 Names</div>
                <div style={{ fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)', color: '#888' }}>Standard Game • 4 Rounds</div>
                <div style={{ fontSize: 'clamp(0.7rem, 2vw, 0.8rem)', color: '#aaa', marginTop: '5px' }}>Round of 16 → Quarterfinals → Semifinals → Finals</div>
              </button>

              <button 
                onClick={() => selectBracketSize(32)} 
                style={{...sizeButtonStyle}}
              >
                <div style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', marginBottom: '10px' }}>🏆</div>
                <div style={{ fontSize: 'clamp(1.2rem, 4vw, 1.5rem)', fontWeight: 'bold' }}>32 Names</div>
                <div style={{ fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)', color: '#888' }}>Full Tournament • 5 Rounds</div>
                <div style={{ fontSize: 'clamp(0.7rem, 2vw, 0.8rem)', color: '#aaa', marginTop: '5px' }}>Round of 32 → Sweet 16 → Elite 8 → Final Four → Championship</div>
              </button>
            </div>

            <div style={{ marginTop: '30px' }}>
              <button onClick={() => setView('home')} style={buttonStyle}>
                ← Back
              </button>
            </div>
          </div>
        )}

        {view === 'enter-names' && (
          <div style={{ maxWidth: '1000px', width: '100%', padding: '20px' }}>
            <h2 style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)' }}>Enter {bracketSize} Baby Names</h2>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <p style={{ color: '#888', margin: 0, fontSize: 'clamp(0.9rem, 3vw, 1rem)' }}>Game ID: {gameId}</p>
              <button 
                onClick={() => copyToClipboard(gameId)} 
                style={{
                  padding: '8px 15px',
                  fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)',
                  backgroundColor: '#4CAF50',
                  border: 'none',
                  borderRadius: '5px',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  minHeight: '36px'
                }}
              >
                📋 Copy
              </button>
            </div>
            <p style={{ color: '#4CAF50', fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)', marginTop: '10px' }}>💡 Share this Game ID with friends so they can make predictions!</p>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(200px, 100%), 1fr))', 
              gap: '10px',
              marginTop: '20px'
            }}>
              {names.map((name, idx) => (
                <input
                  key={idx}
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(idx, e.target.value)}
                  placeholder={`Name ${idx + 1}`}
                  style={inputStyle}
                />
              ))}
            </div>

            <div style={{ marginTop: '30px', display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => goBackWithConfirmation('home')} style={buttonStyle}>
                ← Back
              </button>
              <button onClick={startBracket} style={buttonStyle}>
                Next: Create Bracket →
              </button>
            </div>
          </div>
        )}

        {view === 'view-bracket' && (
          <div style={{ maxWidth: '800px', width: '100%', padding: '20px' }}>
            <h2>Your Master Bracket</h2>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
              <p style={{ color: '#888', margin: 0 }}>Game ID: {gameId} • {bracketSize} Names</p>
              <button 
                onClick={() => copyToClipboard(gameId)} 
                style={{
                  padding: '6px 12px',
                  fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)',
                  backgroundColor: '#4CAF50',
                  border: 'none',
                  borderRadius: '5px',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  minHeight: '32px'
                }}
              >
                📋 Copy
              </button>
            </div>
            <p style={{ color: '#4CAF50', marginBottom: '20px' }}>Winner: {bracket[`${maxRound}-0`] || 'Not complete'}</p>
            
            {rounds.map((round) => (
              <div key={round.num} style={{ marginBottom: '30px' }}>
                <h3 style={{ color: '#764abc', marginBottom: '15px' }}>{round.name}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {Array.from({ length: round.games }).map((_, gameIdx) => {
                    const [name1, name2] = getMatchup(round.num, gameIdx);
                    const winner = bracket[`${round.num}-${gameIdx}`];
                    
                    if (!name1 || !name2) return null;

                    return (
                      <div key={gameIdx} style={{ 
                        padding: '15px', 
                        background: '#2d2d2d', 
                        borderRadius: '10px',
                        border: winner ? '2px solid #4CAF50' : '2px solid #444'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: winner === name1 ? '#4CAF50' : '#fff' }}>
                            {winner === name1 && '👑 '}{name1}
                          </span>
                          <span style={{ color: '#888' }}>vs</span>
                          <span style={{ color: winner === name2 ? '#4CAF50' : '#fff' }}>
                            {winner === name2 && '👑 '}{name2}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <div style={{ marginTop: '30px', display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => goBackWithConfirmation('home')} style={buttonStyle}>
                ← Back to Home
              </button>
              <button onClick={viewPredictions} style={{...buttonStyle, backgroundColor: '#2196F3'}}>
                👁️ View All Predictions
              </button>
              <button onClick={editBracket} style={{...buttonStyle, backgroundColor: '#FF9800'}}>
                ✏️ Edit Bracket
              </button>
            </div>
          </div>
        )}

        {view === 'scoreboard' && (
          <div style={{ maxWidth: '900px', width: '100%', padding: '20px' }}>
            <h2 style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)' }}>🏆 Leaderboard</h2>
            <p style={{ color: '#888', marginBottom: '10px', fontSize: 'clamp(0.9rem, 3vw, 1rem)' }}>Game ID: {gameId} • {bracketSize} Names</p>
            <p style={{ color: '#4CAF50', marginBottom: '30px', fontSize: 'clamp(0.9rem, 3vw, 1rem)' }}>
              Winning Name: {masterBracket[`${maxRound}-0`] || 'Not revealed yet'}
            </p>

            {predictions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                <p style={{ fontSize: '3rem' }}>🤷</p>
                <p>No predictions yet!</p>
                <p style={{ fontSize: '14px', marginTop: '10px' }}>Share the Game ID with friends so they can join.</p>
              </div>
            ) : (
              <div>
                <h3 style={{ color: '#764abc', marginBottom: '20px' }}>Standings</h3>
                {predictions
                  .map(pred => ({
                    ...pred,
                    score: calculateScore(pred.bracket, masterBracket)
                  }))
                  .sort((a, b) => b.score - a.score)
                  .map((pred, idx) => (
                    <div key={pred.id} style={{
                      padding: '15px',
                      marginBottom: '15px',
                      background: idx === 0 ? '#FFD700' : '#2d2d2d',
                      borderRadius: '10px',
                      border: idx === 0 ? '3px solid #FFD700' : '2px solid #444',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '10px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: '1 1 auto' }}>
                        <div style={{ 
                          fontSize: 'clamp(1.5rem, 5vw, 2rem)',
                          color: idx === 0 ? '#000' : '#fff'
                        }}>
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                        </div>
                        <div style={{ flex: '1 1 auto', minWidth: '0' }}>
                          <div style={{ 
                            fontSize: 'clamp(1rem, 4vw, 1.2rem)', 
                            fontWeight: 'bold',
                            color: idx === 0 ? '#000' : '#fff',
                            wordBreak: 'break-word'
                          }}>
                            {pred.playerName}
                          </div>
                          <div style={{ 
                            fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)', 
                            color: idx === 0 ? '#333' : '#888',
                            marginTop: '5px',
                            wordBreak: 'break-word'
                          }}>
                            Predicted winner: {pred.predictedWinner}
                          </div>
                        </div>
                      </div>
                      <div style={{ 
                        fontSize: 'clamp(1.5rem, 5vw, 2rem)', 
                        fontWeight: 'bold',
                        color: idx === 0 ? '#000' : '#4CAF50',
                        whiteSpace: 'nowrap'
                      }}>
                        {pred.score} pts
                      </div>
                    </div>
                  ))}

                <div style={{ 
                  marginTop: '30px', 
                  padding: '20px', 
                  background: '#1a1a1a', 
                  borderRadius: '10px',
                  border: '2px solid #444'
                }}>
                  <h4 style={{ color: '#764abc', marginBottom: '15px' }}>📋 Scoring System</h4>
                  <div style={{ color: '#aaa', fontSize: '0.9rem' }}>
                    {rounds.map((round, idx) => (
                      <div key={round.num} style={{ marginBottom: '8px' }}>
                        • {round.name}: <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>{idx + 1} point{idx === 0 ? '' : 's'}</span> per correct pick
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div style={{ marginTop: '30px', textAlign: 'center' }}>
              <button onClick={() => {
                setView('home');
                setPredictions([]);
                setMasterBracket({});
                setScoreboardGameId('');
              }} style={buttonStyle}>
                ← Back to Home
              </button>
            </div>
          </div>
        )}

        {view === 'view-predictions' && (
          <div style={{ maxWidth: '900px', width: '100%', padding: '20px' }}>
            <h2 style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)' }}>📊 All Predictions</h2>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
              <p style={{ color: '#888', margin: 0, fontSize: 'clamp(0.9rem, 3vw, 1rem)' }}>Game ID: {gameId} • {predictions.length} predictions</p>
            </div>
            <p style={{ color: '#4CAF50', marginBottom: '30px', fontSize: 'clamp(0.9rem, 3vw, 1rem)' }}>
              Your winning name: {masterBracket[`${maxRound}-0`] || 'Not complete'}
            </p>

            <div>
              {predictions.map((pred, idx) => (
                <div key={pred.id} style={{
                  padding: '20px',
                  marginBottom: '15px',
                  background: '#2d2d2d',
                  borderRadius: '10px',
                  border: pred.predictedWinner === masterBracket[`${maxRound}-0`] ? '2px solid #4CAF50' : '2px solid #444'
                }}>
                  <div style={{ marginBottom: '15px' }}>
                    <div style={{ 
                      fontSize: 'clamp(1.1rem, 4vw, 1.3rem)', 
                      fontWeight: 'bold',
                      color: '#fff',
                      marginBottom: '5px'
                    }}>
                      {pred.playerName}
                      {pred.predictedWinner === masterBracket[`${maxRound}-0`] && ' 🎯'}
                    </div>
                    <div style={{ 
                      fontSize: 'clamp(0.9rem, 3vw, 1rem)', 
                      color: pred.predictedWinner === masterBracket[`${maxRound}-0`] ? '#4CAF50' : '#888'
                    }}>
                      Predicted winner: <strong>{pred.predictedWinner}</strong>
                    </div>
                  </div>

                  {/* Show their complete bracket */}
                  <div style={{ borderTop: '1px solid #444', paddingTop: '15px' }}>
                    {rounds.map((round) => {
                      const roundPicks = [];
                      for (let g = 0; g < round.games; g++) {
                        const key = `${round.num}-${g}`;
                        if (pred.bracket[key]) {
                          const isCorrect = pred.bracket[key] === masterBracket[key];
                          roundPicks.push(
                            <span key={key} style={{ 
                              display: 'inline-block',
                              padding: '4px 8px',
                              margin: '4px',
                              background: isCorrect ? '#2e7d32' : '#424242',
                              borderRadius: '4px',
                              fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)',
                              color: isCorrect ? '#fff' : '#aaa'
                            }}>
                              {isCorrect && '✓ '}{pred.bracket[key]}
                            </span>
                          );
                        }
                      }
                      
                      if (roundPicks.length > 0) {
                        return (
                          <div key={round.num} style={{ marginBottom: '10px' }}>
                            <div style={{ 
                              fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)', 
                              color: '#764abc', 
                              fontWeight: 'bold',
                              marginBottom: '5px' 
                            }}>
                              {round.name}:
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                              {roundPicks}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '30px', textAlign: 'center' }}>
              <button onClick={() => {
                setView('view-bracket');
                setPredictions([]);
              }} style={buttonStyle}>
                ← Back to Bracket
              </button>
            </div>
          </div>
        )}

        {view === 'create-bracket' && (
          <div style={{ maxWidth: '800px', width: '100%', padding: '20px' }}>
            <h2 style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)' }}>{rounds[currentRound - 1].name}</h2>
            <p style={{ color: '#888', fontSize: 'clamp(0.9rem, 3vw, 1rem)' }}>
              {isPredicting ? `Making predictions as: ${playerName}` : isEditing ? 'Editing your bracket' : 'Pick your winners for this round'}
            </p>
            {isPredicting && (
              <p style={{ color: '#4CAF50', fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)' }}>
                🎯 Pick who you think the parents will choose!
              </p>
            )}
            
            <div style={{ marginTop: '20px' }}>
              {Array.from({ length: rounds[currentRound - 1].games }).map((_, gameIdx) => {
                const [name1, name2] = getMatchup(currentRound, gameIdx);
                const winner = bracket[`${currentRound}-${gameIdx}`];
                
                if (!name1 || !name2) return null;

                return (
                  <div key={gameIdx} style={{ marginBottom: '20px', padding: '15px', background: '#2d2d2d', borderRadius: '10px' }}>
                    <p style={{ color: '#888', fontSize: '14px', marginBottom: '10px' }}>Game {gameIdx + 1}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <button
                        onClick={() => selectWinner(currentRound, gameIdx, name1)}
                        style={{
                          ...matchupButtonStyle,
                          backgroundColor: winner === name1 ? '#4CAF50' : '#444',
                          transform: winner === name1 ? 'scale(1.05)' : 'scale(1)'
                        }}
                      >
                        {winner === name1 && '👑 '}
                        {name1}
                      </button>
                      <button
                        onClick={() => selectWinner(currentRound, gameIdx, name2)}
                        style={{
                          ...matchupButtonStyle,
                          backgroundColor: winner === name2 ? '#4CAF50' : '#444',
                          transform: winner === name2 ? 'scale(1.05)' : 'scale(1)'
                        }}
                      >
                        {winner === name2 && '👑 '}
                        {name2}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: '30px', display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => goBackWithConfirmation('home')} style={{...buttonStyle, backgroundColor: '#d32f2f'}}>
                ✕ Cancel
              </button>
              {isEditing && (
                <button onClick={() => setView('view-bracket')} style={buttonStyle}>
                  👁️ View Full Bracket
                </button>
              )}
              {currentRound > 1 && (
                <button onClick={() => setCurrentRound(currentRound - 1)} style={buttonStyle}>
                  ← Previous Round
                </button>
              )}
              {currentRound < maxRound && canAdvance() && (
                <button onClick={nextRound} style={buttonStyle}>
                  Next Round →
                </button>
              )}
              {currentRound === maxRound && canAdvance() && (
                <button onClick={saveBracket} style={{...buttonStyle, backgroundColor: '#4CAF50'}}>
                  {isPredicting ? '💾 Save My Predictions' : isEditing ? '💾 Update Tournament' : '💾 Save Tournament'}
                </button>
              )}
            </div>
          </div>
        )}
      </header>
    </div>
  );
}

const buttonStyle = {
  padding: '1rem 2rem',
  fontSize: 'clamp(0.9rem, 3vw, 1rem)',
  fontWeight: 'bold',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  backgroundColor: '#764abc',
  color: 'white',
  transition: 'all 0.3s',
  minHeight: '48px', // Better touch target for mobile
  width: '100%',
  maxWidth: '300px'
};

const sizeButtonStyle = {
  padding: 'clamp(1rem, 4vw, 2rem)',
  fontSize: '1rem',
  border: '2px solid #444',
  borderRadius: '12px',
  cursor: 'pointer',
  backgroundColor: '#2d2d2d',
  color: 'white',
  transition: 'all 0.3s',
  minHeight: '48px',
  ':hover': {
    borderColor: '#764abc',
    transform: 'scale(1.02)'
  }
};

const inputStyle = {
  padding: '12px',
  fontSize: 'clamp(0.9rem, 3vw, 1rem)',
  border: '2px solid #444',
  borderRadius: '5px',
  backgroundColor: '#2d2d2d',
  color: 'white',
  minHeight: '48px', // Better touch target
  width: '100%'
};

const matchupButtonStyle = {
  padding: 'clamp(12px, 3vw, 15px)',
  fontSize: 'clamp(0.9rem, 3vw, 1rem)',
  fontWeight: 'bold',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  color: 'white',
  transition: 'all 0.3s',
  minHeight: '48px', // Better touch target
  wordBreak: 'break-word',
  width: '100%'
};

export default App;