import React, { useState, useEffect } from 'react';
import { Volume2, BookOpen, Star } from 'lucide-react';

const SUPABASE_URL = 'https://lmfyihmgutdqkycfchiv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_vvksyX1iHLLDo_R0MFmXrw_7oLPkzOi';

function App() {
  const [words, setWords] = useState([]);
  const [selectedWord, setSelectedWord] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWords();
  }, []);

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
        if (data.length > 0) {
          setSelectedWord(data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching words:', error);
    }
    setLoading(false);
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
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-3">
            <BookOpen className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              Learn English Everyday HOWDEE
            </h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-4 sticky top-24">
              <h2 className="text-xl font-bold mb-4 text-gray-900">単語リスト</h2>
              <div className="space-y-2">
                {words.map((word) => (
                  <button
                    key={word.id}
                    onClick={() => setSelectedWord(word)}
                    className={`w-full text-left p-3 rounded-lg transition ${
                      selectedWord?.id === word.id
                        ? 'bg-indigo-100 border-2 border-indigo-600'
                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                    }`}
                  >
                    <div className="font-bold text-lg">{word.word}</div>
                    {word.pronunciations?.us?.ipa && (
                      <div className="text-sm text-gray-600">
                        {word.pronunciations.us.ipa}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            {selectedWord && (
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
                    <h2 className="text-5xl font-bold text-gray-900 mb-4">
                      {selectedWord.word}
                    </h2>
                    
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
