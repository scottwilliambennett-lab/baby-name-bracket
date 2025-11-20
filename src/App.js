import React, { useState } from 'react';
import { db } from './firebase';
import { collection, addDoc, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import './App.css';

function App() {
  const [view, setView] = useState('home');
  const [gameId, setGameId] = useState('');
  const [loadGameId, setLoadGameId] = useState('');
  const [names, setNames] = useState(Array(32).fill(''));
  const [bracket, setBracket] = useState({});
  const [currentRound, setCurrentRound] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const [tournamentDocId, setTournamentDocId] = useState('');

  const rounds = [
    { num: 1, name: 'Round of 32', games: 16 },
    { num: 2, name: 'Sweet 16', games: 8 },
    { num: 3, name: 'Elite 8', games: 4 },
    { num: 4, name: 'Final Four', games: 2 },
    { num: 5, name: 'Championship', games: 1 }
  ];

  const createTournament = () => {
    const newGameId = Math.random().toString(36).substring(2, 9).toUpperCase();
    setGameId(newGameId);
    setIsEditing(false);
    setView('enter-names');
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
      setTournamentDocId(tournamentDoc.id);
      setIsEditing(true);
      setCurrentRound(1);
      setView('view-bracket');
      
    } catch (error) {
      console.error('Error loading tournament:', error);
      alert('Error loading tournament!');
    }
  };

  const handleNameChange = (index, value) => {
    const newNames = [...names];
    newNames[index] = value;
    setNames(newNames);
  };

  const startBracket = () => {
    const filledNames = names.filter(n => n.trim()).length;
    
    if (filledNames !== 32) {
      alert(`Please enter all 32 names! You have ${filledNames}/32`);
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
    for (let r = round + 1; r <= 5; r++) {
      const gamesInNextRound = rounds[r - 1].games;
      for (let g = 0; g < gamesInNextRound; g++) {
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
    if (currentRound < 5) {
      setCurrentRound(currentRound + 1);
    }
  };

  const saveBracket = async () => {
    if (!canAdvance()) {
      alert('Please complete all matchups!');
      return;
    }

    try {
      if (isEditing && tournamentDocId) {
        // Update existing tournament
        const docRef = doc(db, 'games', tournamentDocId);
        await updateDoc(docRef, {
          names: names,
          bracket: bracket,
          updatedAt: new Date().toISOString()
        });
        
        const winner = bracket['5-0'];
        alert(`Tournament updated! Game ID: ${gameId}\nWinning name: ${winner}`);
      } else {
        // Create new tournament
        await addDoc(collection(db, 'games'), {
          gameId: gameId,
          names: names,
          bracket: bracket,
          createdAt: new Date().toISOString()
        });
        
        const winner = bracket['5-0'];
        alert(`Tournament saved! Game ID: ${gameId}\nWinning name: ${winner}\n\nSave this ID to edit later!`);
      }
      
      setView('home');
      
      // Reset
      setNames(Array(32).fill(''));
      setBracket({});
      setCurrentRound(1);
      setIsEditing(false);
      setTournamentDocId('');
      setLoadGameId('');
    } catch (error) {
      console.error('Error:', error);
      alert('Error saving tournament!');
    }
  };

  const editBracket = () => {
    setView('create-bracket');
    setCurrentRound(1);
  };

  return (
    <div className="App">
      <header className="App-header">
        {view === 'home' && (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
              👶 🏆 👧
            </div>
            <h1>Baby Name Bracket</h1>
            <p>The Ultimate Name Reveal Game</p>
            
            <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', width: '300px' }}>
              <button onClick={createTournament} style={buttonStyle}>
                ➕ Create New Tournament
              </button>
              
              <button onClick={() => alert('Coming soon!')} style={buttonStyle}>
                👥 Join & Make Predictions
              </button>
              
              <div style={{ marginTop: '1rem' }}>
                <p style={{ color: '#888', fontSize: '14px', marginBottom: '10px' }}>Continue as Parents:</p>
                <input
                  type="text"
                  value={loadGameId}
                  onChange={(e) => setLoadGameId(e.target.value)}
                  placeholder="Enter Game ID"
                  style={{...inputStyle, width: '100%', marginBottom: '10px'}}
                />
                <button onClick={loadTournament} style={buttonStyle}>
                  👑 Load My Tournament
                </button>
              </div>
            </div>
          </>
        )}

        {view === 'enter-names' && (
          <div style={{ maxWidth: '1000px', width: '100%', padding: '20px' }}>
            <h2>Enter 32 Baby Names</h2>
            <p style={{ color: '#888' }}>Game ID: {gameId}</p>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
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

            <div style={{ marginTop: '30px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={() => setView('home')} style={buttonStyle}>
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
            <p style={{ color: '#888' }}>Game ID: {gameId}</p>
            <p style={{ color: '#4CAF50', marginBottom: '20px' }}>Winner: {bracket['5-0'] || 'Not complete'}</p>
            
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

            <div style={{ marginTop: '30px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={() => setView('home')} style={buttonStyle}>
                ← Back to Home
              </button>
              <button onClick={editBracket} style={{...buttonStyle, backgroundColor: '#FF9800'}}>
                ✏️ Edit Bracket
              </button>
            </div>
          </div>
        )}

        {view === 'create-bracket' && (
          <div style={{ maxWidth: '800px', width: '100%', padding: '20px' }}>
            <h2>{rounds[currentRound - 1].name}</h2>
            <p style={{ color: '#888' }}>
              {isEditing ? 'Editing your bracket' : 'Pick your winners for this round'}
            </p>
            
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
              {currentRound < 5 && canAdvance() && (
                <button onClick={nextRound} style={buttonStyle}>
                  Next Round →
                </button>
              )}
              {currentRound === 5 && canAdvance() && (
                <button onClick={saveBracket} style={{...buttonStyle, backgroundColor: '#4CAF50'}}>
                  {isEditing ? '💾 Update Tournament' : '💾 Save Tournament'}
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
  fontSize: '1rem',
  fontWeight: 'bold',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  backgroundColor: '#764abc',
  color: 'white',
  transition: 'all 0.3s'
};

const inputStyle = {
  padding: '10px',
  fontSize: '14px',
  border: '2px solid #444',
  borderRadius: '5px',
  backgroundColor: '#2d2d2d',
  color: 'white'
};

const matchupButtonStyle = {
  padding: '15px',
  fontSize: '16px',
  fontWeight: 'bold',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  color: 'white',
  transition: 'all 0.3s'
};

export default App;