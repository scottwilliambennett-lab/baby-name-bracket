import React, { useState } from 'react';
import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';
import './App.css';

function App() {
  const [view, setView] = useState('home');
  const [gameId, setGameId] = useState('');
  const [names, setNames] = useState(Array(32).fill(''));
  const [bracket, setBracket] = useState({});
  const [currentRound, setCurrentRound] = useState(1);

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
    setView('enter-names');
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
      await addDoc(collection(db, 'games'), {
        gameId: gameId,
        names: names,
        bracket: bracket,
        createdAt: new Date().toISOString()
      });
      
      const winner = bracket['5-0'];
      alert(`Tournament saved! Game ID: ${gameId}\nWinning name: ${winner}`);
      setView('home');
      
      // Reset
      setNames(Array(32).fill(''));
      setBracket({});
      setCurrentRound(1);
    } catch (error) {
      console.error('Error:', error);
      alert('Error saving tournament!');
    }
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
              
              <button onClick={() => alert('Coming soon!')} style={buttonStyle}>
                👑 Continue as Parents
              </button>
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

        {view === 'create-bracket' && (
          <div style={{ maxWidth: '800px', width: '100%', padding: '20px' }}>
            <h2>{rounds[currentRound - 1].name}</h2>
            <p style={{ color: '#888' }}>Pick your winners for this round</p>
            
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

            <div style={{ marginTop: '30px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
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
                <button onClick={saveBracket} style={buttonStyle}>
                  Save Tournament! ✓
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