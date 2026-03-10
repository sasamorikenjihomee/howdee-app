import React, { useState, useEffect } from 'react';
import { Volume2, BookOpen, Star, Search, X, Heart, LogOut, User, ArrowLeft } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lmfyihmgutdqkycfchiv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_vvksyX1iHLLDo_R0MFmXrw_7oLPkzOi';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function App() {
  const [user, setUser] = useState(null);
  const [words, setWords] = useState([]);
  const [selectedWord, setSelectedWord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredWords, setFilteredWords] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  
  // ページ遷移
  const [currentView, setCurrentView] = useState('list'); // 'list' or 'detail'
  
  // 認証用state
  const [showAuth, setShowAuth] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    checkUser();
    fetchWords();
    
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchFavorites(session.user.id);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    filterWords();
  }, [searchQuery, words, showFavoritesOnly, favorites]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user ?? null);
    if (session?.user) {
      await fetchFavorites(session.user.id);
    }
  };

  const fetchWords = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/words?select=*&is_published=eq.true&order=created_at.desc`,
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setWords(data);
        setFilteredWords(data);
      }
    } catch (error) {
      console.error('Error fetching words:', error);
    }
    setLoading(false);
  };

  const fetchFavorites = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('word_id')
        .eq('user_id', userId);
      
      if (error) throw error;
      
      const favoriteWordIds = data.map(f => f.word_id);
      setFavorites(favoriteWordIds);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  const toggleFavorite = async (wordId) => {
    if (!user) {
      setShowAuth(true);
      return;
    }

    const isFavorited = favorites.includes(wordId);

    try {
      if (isFavorited) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('word_id', wordId);
        
        if (error) throw error;
        setFavorites(favorites.filter(id => id !== wordId));
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert({ user_id: user.id, word_id: wordId });
        
        if (error) throw error;
        setFavorites([...favorites, wordId]);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const filterWords = () => {
    let filtered = words;

    if (showFavoritesOnly) {
      filtered = filtered.filter(word => favorites.includes(word.id));
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(word => {
        if (word.word.toLowerCase().includes(query)) return true;
        
        if (word.meanings) {
          for (const meaning of word.meanings) {
            if (meaning.definitions) {
              for (const def of meaning.definitions) {
                if (def.definition?.toLowerCase().includes(query) ||
                    def.explanation?.toLowerCase().includes(query)) {
                  return true;
                }
                if (def.examples) {
                  for (const example of def.examples) {
                    if (example.toLowerCase().includes(query)) return true;
                  }
                }
              }
            }
          }
        }
        return false;
      });
    }

    setFilteredWords(filtered);
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) throw error;
      
      alert('確認メールを送信しました。メールを確認してアカウントを有効化してください。');
      setShowAuth(false);
      setEmail('');
      setPassword('');
    } catch (error) {
      setAuthError(error.message);
    }
    
    setAuthLoading(false);
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      setShowAuth(false);
      setEmail('');
      setPassword('');
    } catch (error) {
      setAuthError(error.message);
    }
    
    setAuthLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setFavorites([]);
    setShowFavoritesOnly(false);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const openWordDetail = (word) => {
    setSelectedWord(word);
    setCurrentView('detail');
    window.scrollTo(0, 0);
  };

  const backToList = () => {
    setCurrentView('list');
    window.scrollTo(0, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-2xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* 認証モーダル */}
      {showAuth && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {isSignUp ? 'アカウント作成' : 'ログイン'}
              </h2>
              <button onClick={() => setShowAuth(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  メールアドレス
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  パスワード
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                  minLength={6}
                />
              </div>

              {authError && (
                <div className="text-red-600 text-sm">{authError}</div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 font-medium"
              >
                {authLoading ? '処理中...' : (isSignUp ? 'アカウント作成' : 'ログイン')}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-indigo-600 hover:text-indigo-700 text-sm"
              >
                {isSignUp ? 'すでにアカウントをお持ちの方はこちら' : 'アカウントを作成する'}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {currentView === 'detail' && (
                <button
                  onClick={backToList}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <ArrowLeft className="w-6 h-6 text-gray-700" />
                </button>
              )}
              <BookOpen className="w-8 h-8 text-indigo-600" />
              <h1 className="text-3xl font-bold text-gray-900">
                Learn English Everyday HOWDEE
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* 検索バー */}
              <div className="relative w-96">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="単語を検索..."
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>

              {/* ユーザーメニュー */}
              {user ? (
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                      showFavoritesOnly
                        ? 'bg-red-100 text-red-700 border-2 border-red-600'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${showFavoritesOnly ? 'fill-current' : ''}`} />
                    <span>お気に入り ({favorites.length})</span>
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>ログアウト</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuth(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  <User className="w-5 h-5" />
                  <span>ログイン</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {currentView === 'list' ? (
          // 単語一覧ページ
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {showFavoritesOnly ? 'お気に入りの単語' : 'すべての単語'}
              </h2>
              <p className="text-gray-600">
                {filteredWords.length}件の単語
              </p>
            </div>

            {filteredWords.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-500 mb-4">
                  {showFavoritesOnly ? 'お気に入りがありません' : '検索結果がありません'}
                </p>
                <button
                  onClick={() => {
                    clearSearch();
                    setShowFavoritesOnly(false);
                  }}
                  className="text-indigo-600 hover:text-indigo-700 underline"
                >
                  すべて表示
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredWords.map((word) => (
                  <div
                    key={word.id}
                    className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition cursor-pointer"
                  >
                    {/* YouTube サムネイル */}
                    {word.youtube_shorts && word.youtube_shorts.length > 0 && (
                      <div 
                        className="relative h-48 bg-gray-200"
                        onClick={() => openWordDetail(word)}
                      >
                        <img
                          src={`https://img.youtube.com/vi/${word.youtube_shorts[0]}/mqdefault.jpg`}
                          alt={word.word}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
                          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
                            <div className="w-0 h-0 border-l-8 border-l-white border-t-6 border-t-transparent border-b-6 border-b-transparent ml-1"></div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="p-6" onClick={() => openWordDetail(word)}>
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-2xl font-bold text-gray-900">{word.word}</h3>
                      </div>
                      
                      {word.pronunciations?.us?.ipa && (
                        <p className="text-gray-600 mb-3">{word.pronunciations.us.ipa}</p>
                      )}

                      {word.meanings && word.meanings[0]?.definitions && word.meanings[0].definitions[0] && (
                        <p className="text-gray-700 line-clamp-2">
                          {word.meanings[0].definitions[0].definition}
                        </p>
                      )}
                    </div>

                    <div className="px-6 pb-6">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(word.id);
                        }}
                        className="w-full flex items-center justify-center space-x-2 py-2 border-2 border-gray-200 rounded-lg hover:bg-gray-50 transition"
                      >
                        <Heart
                          className={`w-5 h-5 ${
                            favorites.includes(word.id)
                              ? 'fill-red-500 text-red-500'
                              : 'text-gray-400'
                          }`}
                        />
                        <span className="text-gray-700">
                          {favorites.includes(word.id) ? 'お気に入り済み' : 'お気に入りに追加'}
                        </span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          // 単語詳細ページ（既存のコード）
          selectedWord && (
            <div className="space-y-6">
              {selectedWord.youtube_shorts && selectedWord.youtube_shorts.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                  <div className="aspect-video">
                    <iframe
                      width="100%"
                      height="100%"
                      src={`https://www.youtube.com/embed/${selectedWord.youtube_shorts[0]}`}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl shadow-lg p-8">
                <div className="border-b pb-6 mb-6">
                  <div className="flex items-start justify-between mb-4">
                    <h2 className="text-5xl font-bold text-gray-900">
                      {selectedWord.word}
                    </h2>
                    <button
                      onClick={() => toggleFavorite(selectedWord.id)}
                      className="p-3 hover:bg-gray-100 rounded-full transition"
                    >
                      <Heart
                        className={`w-8 h-8 ${
                          favorites.includes(selectedWord.id)
                            ? 'fill-red-500 text-red-500'
                            : 'text-gray-400'
                        }`}
                      />
                    </button>
                  </div>
                  
                  {selectedWord.pronunciations && (
                    <div className="space-y-2">
                      {selectedWord.pronunciations.us?.ipa && (
                        <div className="flex items-center space-x-3">
                          <span className="text-gray-600">🇺🇸 US:</span>
                          <span className="font-mono text-lg">{selectedWord.pronunciations.us.ipa}</span>
                          <button className="p-2 hover:bg-gray-100 rounded-full">
                            <Volume2 className="w-5 h-5 text-indigo-600" />
                          </button>
                        </div>
                      )}
                      {selectedWord.pronunciations.uk?.ipa && (
                        <div className="flex items-center space-x-3">
                          <span className="text-gray-600">🇬🇧 UK:</span>
                          <span className="font-mono text-lg">{selectedWord.pronunciations.uk.ipa}</span>
                          <button className="p-2 hover:bg-gray-100 rounded-full">
                            <Volume2 className="w-5 h-5 text-indigo-600" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {selectedWord.necessity_ratings && (
                  <div className="mb-8 p-6 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl">
                    <h3 className="font-bold text-xl mb-4 text-gray-900">学習の重要度</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        ['アメリカ英会話', selectedWord.necessity_ratings.american_conversation],
                        ['イギリス英会話', selectedWord.necessity_ratings.british_conversation],
                        ['TOEIC', selectedWord.necessity_ratings.toeic],
                        ['英検', selectedWord.necessity_ratings.eiken]
                      ].map(([label, value]) => (
                        <div key={label}>
                          <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>
                          <div className="flex space-x-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-6 h-6 ${
                                  i < value
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedWord.meanings && selectedWord.meanings.map((meaning, idx) => (
                  <div key={idx} className="mb-8">
                    <div className="flex items-center space-x-3 mb-4">
                      <span className="px-4 py-2 bg-indigo-600 text-white rounded-full font-bold">
                        {meaning.part_of_speech}
                      </span>
                    </div>
                    
                    {meaning.definitions && meaning.definitions.map((def, defIdx) => (
                      <div key={defIdx} className="mb-6 pl-4 border-l-4 border-indigo-200">
                        <h4 className="text-2xl font-bold text-gray-900 mb-3">
                          {def.definition}
                        </h4>
                        {def.explanation && (
                          <p className="text-gray-700 text-lg leading-relaxed mb-4">
                            {def.explanation}
                          </p>
                        )}
                        {def.examples && def.examples.length > 0 && (
                          <div className="space-y-3 mt-4">
                            <p className="font-semibold text-gray-800">例文：</p>
                            {def.examples.map((example, exIdx) => (
                              <div key={exIdx} className="flex items-start space-x-3 bg-gray-50 p-4 rounded-lg">
                                <div className="flex-shrink-0 w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-sm">
                                  {exIdx + 1}
                                </div>
                                <p className="text-gray-800 italic flex-1">{example}</p>
                                <button className="flex-shrink-0 p-2 hover:bg-gray-200 rounded-full">
                                  <Volume2 className="w-4 h-4 text-indigo-600" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}

                {selectedWord.idioms && selectedWord.idioms.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">慣用句</h3>
                    <div className="space-y-4">
                      {selectedWord.idioms.map((idiom, idx) => (
                        <div key={idx} className="p-5 bg-amber-50 border-l-4 border-amber-400 rounded-lg">
                          <p className="font-bold text-xl text-gray-900 mb-2">{idiom.phrase}</p>
                          <p className="text-gray-700 mb-2">{idiom.meaning}</p>
                          <p className="text-gray-600 italic">"{idiom.example}"</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedWord.similar_words && selectedWord.similar_words.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">類似単語</h3>
                    <div className="flex flex-wrap gap-3">
                      {selectedWord.similar_words.map((word, idx) => (
                        <span
                          key={idx}
                          className="px-4 py-2 bg-green-100 text-green-800 rounded-full font-medium hover:bg-green-200 cursor-pointer transition"
                        >
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedWord.nearby_words && selectedWord.nearby_words.length > 0 && (
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">
                      アルファベット順で近い単語
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedWord.nearby_words.slice(0, 12).map((word, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 cursor-pointer transition"
                        >
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default App;
