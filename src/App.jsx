import React, { useState, useEffect, useRef } from 'react';
import { Volume2, BookOpen, Star, Search, X, Heart, LogOut, User, ArrowLeft, MessageSquare, Send, Trash2, Rss, ChevronDown, ChevronUp, ThumbsUp, Edit2, Menu, Share2 } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const extractYouTubeId = (url) => {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
};

// ===== Web Speech API で発音 =====
const speak = (text, lang = 'en-US') => {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  window.speechSynthesis.speak(utterance);
};

// ===== 屈折形ラベル =====
const INFLECTION_LABELS = {
  plural: '複数形', past: '過去形', past_participle: '過去分詞',
  present_participle: '現在分詞', third_person_singular: '三人称単数',
  third_person: '三人称単数', comparative: '比較級', superlative: '最上級',
};

// ===== テキスト内の登録単語をクリッカブルに変換 =====
const linkifyText = (text, words, onWordClick) => {
  if (!text || !words?.length) return text;
  const wordMap = {};
  words.forEach(w => { wordMap[w.word.toLowerCase()] = w; });
  const tokens = text.split(/(\s+)/);
  return tokens.map((token, i) => {
    const clean = token.replace(/[^a-zA-Z]/g, '').toLowerCase();
    const matched = clean && wordMap[clean];
    if (matched) {
      return (
        <span key={i}
          className="text-blue-500 cursor-pointer hover:underline font-medium"
          onClick={(e) => { e.stopPropagation(); onWordClick(matched); }}>
          {token}
        </span>
      );
    }
    return token;
  });
};

// ===== 動画プレイヤー（スクロール自動再生） =====
const WordVideoPlayer = ({ videoId }) => {
  const containerRef = useRef(null);
  const [state, setState] = useState('thumbnail'); // 'thumbnail' | 'autoplay' | 'controls'

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // このビデオが画面に入ったことをグローバルに通知
          window.dispatchEvent(new CustomEvent('howdee:videoInView', { detail: { id: videoId } }));
        }
      },
      { threshold: 0.6 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [videoId]);

  useEffect(() => {
    const handler = (e) => {
      if (state === 'controls') return; // ユーザーが操作中は変えない
      setState(e.detail.id === videoId ? 'autoplay' : 'thumbnail');
    };
    window.addEventListener('howdee:videoInView', handler);
    return () => window.removeEventListener('howdee:videoInView', handler);
  }, [videoId, state]);

  const handleClick = (e) => {
    e.stopPropagation();
    setState('controls');
  };

  // w7:h8 比率 = 8/7 * 100 ≈ 114.3%
  const ratio = `${(8 / 7) * 100}%`;

  return (
    <div ref={containerRef}
      className="relative w-full rounded-2xl overflow-hidden bg-gray-100 mb-3"
      style={{ paddingBottom: ratio }}
      onClick={handleClick}>
      {state === 'thumbnail' ? (
        <>
          <img
            src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
            alt="video thumbnail"
            className="absolute inset-0 w-full h-full object-cover object-center"
            onError={(e) => { e.target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`; }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 bg-red-600 bg-opacity-90 rounded-full flex items-center justify-center shadow-lg">
              <div className="w-0 h-0 border-l-[10px] border-l-white border-t-[7px] border-t-transparent border-b-[7px] border-b-transparent ml-1"></div>
            </div>
          </div>
        </>
      ) : (
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=${state === 'controls' ? 1 : 0}&playsinline=1&rel=0&modestbranding=1`}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          title="video"
        />
      )}
    </div>
  );
};

// ===== プロフィール編集モーダル =====
const ProfileEditModal = ({ user, profile, onClose, onSave }) => {
  const [username, setUsername] = useState(profile?.username || '');
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, username: username.trim(), display_name: displayName.trim(), updated_at: new Date().toISOString() })
        .select().single();
      if (error) throw error;
      onSave(data); onClose();
    } catch (err) { setError(err.message); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">プロフィール編集</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ユーザー名（@username）</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
              placeholder="例: howdee_user"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-1 focus:ring-gray-900 text-base" />
            <p className="text-xs text-gray-400 mt-1">英数字とアンダースコアのみ使用可能</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">表示名</label>
            <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
              placeholder="例: HOWDEEユーザー"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-1 focus:ring-gray-900 text-base" />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex space-x-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-full hover:bg-gray-50 text-base font-medium transition">
              キャンセル
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-full hover:bg-black disabled:bg-gray-400 text-base">
              {saving ? '保存中...' : '保存する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ===== プロフィールページ =====
const ProfilePage = ({ user, profile, onEditProfile, currentUser, onLoginRequired }) => {
  const [userPosts, setUserPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const isOwnProfile = currentUser?.id === user?.id;

  useEffect(() => { fetchUserPosts(); }, [user]);

  const fetchUserPosts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('posts').select('*, words(word)').eq('user_id', user.id).order('created_at', { ascending: false });
      if (error) throw error;
      setUserPosts(data || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const displayName = profile?.display_name || profile?.username || user?.email || 'ユーザー';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-8 h-8 md:w-10 md:h-10 text-gray-900" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">{displayName}</h2>
              {profile?.username && <p className="text-gray-500 text-sm">@{profile.username}</p>}
              <p className="text-xs text-gray-400 mt-1">{user?.email}</p>
            </div>
          </div>
          {isOwnProfile && (
            <button onClick={onEditProfile}
              className="flex items-center space-x-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 text-sm">
              <Edit2 className="w-4 h-4" />
              <span className="hidden sm:inline">編集</span>
            </button>
          )}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-gray-600 text-sm">投稿数: <span className="font-bold text-gray-900">{userPosts.length}件</span></p>
        </div>
      </div>

      <div>
        <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4">投稿一覧</h3>
        {loading ? (
          <p className="text-center text-gray-500 py-8">読み込み中...</p>
        ) : userPosts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow">
            <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">まだ投稿がありません</p>
          </div>
        ) : (
          <div className="space-y-4">
            {userPosts.map(post => (
              <PostCard key={post.id} post={post} currentUser={currentUser}
                onDelete={async (postId) => {
                  if (!window.confirm('この投稿を削除しますか？')) return;
                  const { error } = await supabase.from('posts').delete().eq('id', postId);
                  if (!error) setUserPosts(userPosts.filter(p => p.id !== postId));
                }}
                onLoginRequired={onLoginRequired} wordName={post.words?.word} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ===== コメントセクション =====
const CommentSection = ({ postId, currentUser, onLoginRequired }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('comments').select('*').eq('post_id', postId).order('created_at', { ascending: true });
      if (error) throw error;
      setComments(data || []);
    } catch (error) { console.error(error); }
    setLoading(false);
  };

  const handleToggle = () => {
    if (!isOpen && comments.length === 0) fetchComments();
    setIsOpen(!isOpen);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) { onLoginRequired(); return; }
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.from('comments')
        .insert({ post_id: postId, user_id: currentUser.id, user_email: currentUser.email, content: newComment.trim() })
        .select().single();
      if (error) throw error;
      setComments([...comments, data]); setNewComment('');
    } catch (error) { console.error(error); }
    setSubmitting(false);
  };

  const handleDelete = async (commentId) => {
    if (!window.confirm('このコメントを削除しますか？')) return;
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (!error) setComments(comments.filter(c => c.id !== commentId));
  };

  return (
    <div className="border-t border-gray-100 pt-3">
      <button onClick={handleToggle} className="flex items-center space-x-2 text-sm text-gray-500 hover:text-gray-900 transition py-1">
        <MessageSquare className="w-4 h-4" />
        <span>コメント {comments.length > 0 ? `(${comments.length})` : ''}</span>
        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {isOpen && (
        <div className="mt-3 space-y-3">
          {loading ? <p className="text-xs text-gray-400 pl-2">読み込み中...</p>
            : comments.length === 0 ? <p className="text-xs text-gray-400 pl-2">まだコメントがありません</p>
            : (
              <div className="space-y-2">
                {comments.map(comment => {
                  const isOwner = currentUser?.id === comment.user_id;
                  const date = new Date(comment.created_at).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                  return (
                    <div key={comment.id} className="flex items-start space-x-2 pl-2">
                      <div className="w-7 h-7 bg-gray-50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <User className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-700 truncate max-w-[150px]">{comment.user_email || '匿名'}</span>
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            <span className="text-xs text-gray-400">{date}</span>
                            {isOwner && (
                              <button onClick={() => handleDelete(comment.id)} className="text-gray-300 hover:text-red-400 transition p-1">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{comment.content}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          <form onSubmit={handleSubmit} className="flex items-center space-x-2 pl-2">
            <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)}
              placeholder={currentUser ? 'コメントを入力...' : 'ログインしてコメント'}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-transparent"
              disabled={!currentUser} onClick={!currentUser ? onLoginRequired : undefined} />
            <button type="submit" disabled={submitting || !currentUser || !newComment.trim()}
              className="p-2 bg-gray-900 text-white rounded-full hover:bg-black disabled:bg-gray-200 disabled:cursor-not-allowed transition flex-shrink-0">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

// ===== いいねボタン =====
const LikeButton = ({ postId, currentUser, onLoginRequired }) => {
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchLikes(); }, [postId, currentUser]);

  const fetchLikes = async () => {
    try {
      const { data, error } = await supabase.from('likes').select('id, user_id').eq('post_id', postId);
      if (error) throw error;
      setLikeCount(data.length);
      if (currentUser) setLiked(data.some(l => l.user_id === currentUser.id));
    } catch (error) { console.error(error); }
  };

  const handleToggle = async () => {
    if (!currentUser) { onLoginRequired(); return; }
    setLoading(true);
    try {
      if (liked) {
        await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', currentUser.id);
        setLiked(false); setLikeCount(prev => prev - 1);
      } else {
        await supabase.from('likes').insert({ post_id: postId, user_id: currentUser.id });
        setLiked(true); setLikeCount(prev => prev + 1);
      }
    } catch (error) { console.error(error); }
    setLoading(false);
  };

  return (
    <button onClick={handleToggle} disabled={loading}
      className={`flex items-center space-x-1.5 px-3 py-2 rounded-full text-sm transition ${
        liked ? 'bg-blue-50 text-blue-500' : 'text-gray-400 hover:bg-gray-100 hover:text-blue-400'
      }`}>
      <ThumbsUp className={`w-4 h-4 ${liked ? 'fill-blue-500 text-blue-500' : ''}`} />
      <span>{likeCount > 0 ? `${likeCount} ` : ''}いいね</span>
    </button>
  );
};

// ===== 投稿カード =====
const PostCard = ({ post, currentUser, onDelete, onLoginRequired, wordName }) => {
  const videoId = extractYouTubeId(post.youtube_url);
  const isOwner = currentUser?.id === post.user_id;
  const date = new Date(post.created_at).toLocaleDateString('ja-JP', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-gray-900" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{post.user_email || '匿名ユーザー'}</p>
            <p className="text-xs text-gray-400">{date}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
          {wordName && <span className="hidden sm:inline px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-full font-medium">{wordName}</span>}
          {isOwner && (
            <button onClick={() => onDelete(post.id)} className="p-2 hover:bg-red-50 rounded-full text-gray-400 hover:text-red-500 transition">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      {wordName && <span className="sm:hidden inline-block px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-full font-medium">{wordName}</span>}
      <p className="text-gray-800 whitespace-pre-wrap text-sm md:text-base">{post.content}</p>
      {videoId && (
        <div className="aspect-video rounded-lg overflow-hidden">
          <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${videoId}`}
            frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
        </div>
      )}
      <div className="flex items-center pt-1">
        <LikeButton postId={post.id} currentUser={currentUser} onLoginRequired={onLoginRequired} />
      </div>
      <CommentSection postId={post.id} currentUser={currentUser} onLoginRequired={onLoginRequired} />
    </div>
  );
};

// ===== 投稿フォーム =====
const PostForm = ({ user, onSubmit, onLoginRequired }) => {
  const [content, setContent] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) { onLoginRequired(); return; }
    if (!content.trim()) return;
    setSubmitting(true);
    await onSubmit({ content: content.trim(), youtube_url: youtubeUrl.trim() || null });
    setContent(''); setYoutubeUrl('');
    setSubmitting(false);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 md:p-5">
      <h4 className="font-bold text-gray-900 mb-3 flex items-center space-x-2 text-sm md:text-base">
        <MessageSquare className="w-5 h-5 text-gray-900" />
        <span>この単語について投稿する</span>
      </h4>
      {!user && (
        <p className="text-sm text-gray-500 mb-3">
          投稿するには<button onClick={onLoginRequired} className="text-blue-500 hover:underline mx-1 font-medium">ログイン</button>が必要です
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea value={content} onChange={(e) => setContent(e.target.value)}
          placeholder="この単語の使い方、覚え方、エピソードなど..."
          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-transparent resize-none text-sm md:text-base"
          rows={3} disabled={!user} />
        <input type="url" value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)}
          placeholder="YouTube URL（任意）"
          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-transparent text-sm md:text-base"
          disabled={!user} />
        <button type="submit" disabled={submitting || !user || !content.trim()}
          className="flex items-center space-x-2 px-5 py-2.5 bg-gray-900 text-white rounded-full hover:bg-black disabled:bg-gray-300 disabled:cursor-not-allowed transition text-sm font-medium w-full justify-center sm:w-auto">
          <Send className="w-4 h-4" />
          <span>{submitting ? '投稿中...' : '投稿する'}</span>
        </button>
      </form>
    </div>
  );
};

// ===== メインApp =====
function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [words, setWords] = useState([]);
  const [selectedWord, setSelectedWord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredWords, setFilteredWords] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [currentView, setCurrentView] = useState('list');
  const [wordPosts, setWordPosts] = useState([]);
  const [feedPosts, setFeedPosts] = useState([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    checkUser(); fetchWords();
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) { fetchFavorites(session.user.id); fetchProfile(session.user.id); }
      else setProfile(null);
    });
    return () => { authListener?.subscription?.unsubscribe(); };
  }, []);

  useEffect(() => { filterWords(); }, [searchQuery, words, showFavoritesOnly, favorites]);
  useEffect(() => { if (currentView === 'feed') fetchFeedPosts(); }, [currentView]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user ?? null);
    if (session?.user) { await fetchFavorites(session.user.id); await fetchProfile(session.user.id); }
  };

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (error && error.code !== 'PGRST116') throw error;
      setProfile(data || null);
    } catch (error) { console.error(error); }
  };

  const fetchWords = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/words?select=*&is_published=eq.true&order=created_at.desc`,
        { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
      );
      if (response.ok) { const data = await response.json(); setWords(data); setFilteredWords(data); }
    } catch (error) { console.error(error); }
    setLoading(false);
  };

  const fetchFavorites = async (userId) => {
    try {
      const { data, error } = await supabase.from('favorites').select('word_id').eq('user_id', userId);
      if (error) throw error;
      setFavorites(data.map(f => f.word_id));
    } catch (error) { console.error(error); }
  };

  const fetchWordPosts = async (wordId) => {
    try {
      const { data, error } = await supabase.from('posts').select('*').eq('word_id', wordId).order('created_at', { ascending: false });
      if (error) throw error;
      setWordPosts(data || []);
    } catch (error) { console.error(error); }
  };

  const fetchFeedPosts = async () => {
    setFeedLoading(true);
    try {
      const { data, error } = await supabase.from('posts').select('*, words(word)').order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      setFeedPosts(data || []);
    } catch (error) { console.error(error); }
    setFeedLoading(false);
  };

  const createPost = async ({ content, youtube_url }) => {
    if (!user || !selectedWord) return;
    try {
      const { data, error } = await supabase.from('posts')
        .insert({ user_id: user.id, word_id: selectedWord.id, content, youtube_url, user_email: user.email })
        .select().single();
      if (error) throw error;
      setWordPosts([data, ...wordPosts]);
    } catch (error) { console.error(error); }
  };

  const deletePost = async (postId) => {
    if (!window.confirm('この投稿を削除しますか？')) return;
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (!error) { setWordPosts(wordPosts.filter(p => p.id !== postId)); setFeedPosts(feedPosts.filter(p => p.id !== postId)); }
  };

  const toggleFavorite = async (wordId) => {
    if (!user) { setShowAuth(true); return; }
    const isFavorited = favorites.includes(wordId);
    if (isFavorited) {
      await supabase.from('favorites').delete().eq('user_id', user.id).eq('word_id', wordId);
      setFavorites(favorites.filter(id => id !== wordId));
    } else {
      await supabase.from('favorites').insert({ user_id: user.id, word_id: wordId });
      setFavorites([...favorites, wordId]);
    }
  };

  const filterWords = () => {
    let filtered = words;
    if (showFavoritesOnly) filtered = filtered.filter(word => favorites.includes(word.id));
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(word => {
        if (word.word.toLowerCase().includes(query)) return true;
        if (word.meanings) {
          for (const meaning of word.meanings) {
            if (meaning.definitions) {
              for (const def of meaning.definitions) {
                if (def.definition?.toLowerCase().includes(query) || def.explanation?.toLowerCase().includes(query)) return true;
                if (def.examples) for (const ex of def.examples) if (ex.toLowerCase().includes(query)) return true;
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
    e.preventDefault(); setAuthLoading(true); setAuthError('');
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      alert('確認メールを送信しました。'); setShowAuth(false); setEmail(''); setPassword('');
    } catch (error) { setAuthError(error.message); }
    setAuthLoading(false);
  };

  const handleSignIn = async (e) => {
    e.preventDefault(); setAuthLoading(true); setAuthError('');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setShowAuth(false); setEmail(''); setPassword('');
    } catch (error) { setAuthError(error.message); }
    setAuthLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null); setProfile(null); setFavorites([]); setShowFavoritesOnly(false); setCurrentView('list');
  };

  const navigateTo = (view) => {
    setCurrentView(view);
    setShowMobileMenu(false);
    window.scrollTo(0, 0);
  };

  const openWordDetail = (word) => {
    setSelectedWord(word); setCurrentView('detail');
    fetchWordPosts(word.id); window.scrollTo(0, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-sm text-gray-400 tracking-widest">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16 md:pb-0">

      {/* 認証モーダル */}
      {showAuth && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">{isSignUp ? 'アカウント作成' : 'ログイン'}</h2>
              <button onClick={() => setShowAuth(false)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-6 h-6 text-gray-600" /></button>
            </div>
            <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">メールアドレス</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-1 focus:ring-gray-900 text-base" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">パスワード</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-1 focus:ring-gray-900 text-base" required minLength={6} />
              </div>
              {authError && <div className="text-red-600 text-sm">{authError}</div>}
              <button type="submit" disabled={authLoading}
                className="w-full bg-gray-900 text-white py-3 rounded-full hover:bg-black disabled:bg-gray-400 font-medium text-base">
                {authLoading ? '処理中...' : (isSignUp ? 'アカウント作成' : 'ログイン')}
              </button>
            </form>
            <div className="mt-4 text-center">
              <button onClick={() => setIsSignUp(!isSignUp)} className="text-gray-900 hover:text-gray-900 text-sm">
                {isSignUp ? 'すでにアカウントをお持ちの方はこちら' : 'アカウントを作成する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* プロフィール編集モーダル */}
      {showProfileEdit && user && (
        <ProfileEditModal user={user} profile={profile} onClose={() => setShowProfileEdit(false)} onSave={(p) => setProfile(p)} />
      )}

      {/* モバイルメニュー */}
      {showMobileMenu && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={() => setShowMobileMenu(false)}>
          <div className="absolute right-0 top-0 h-full w-72 bg-white shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold text-gray-900">メニュー</h3>
              <button onClick={() => setShowMobileMenu(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            {user ? (
              <div className="space-y-2">
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-2xl mb-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-900" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{profile?.display_name || profile?.username || 'ユーザー'}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                </div>
                <button onClick={() => { setShowFavoritesOnly(!showFavoritesOnly); setShowMobileMenu(false); navigateTo('list'); }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition ${showFavoritesOnly ? 'bg-red-50 text-red-700' : 'hover:bg-gray-50 text-gray-700'}`}>
                  <Heart className={`w-5 h-5 ${showFavoritesOnly ? 'fill-current' : ''}`} />
                  <span>お気に入り ({favorites.length})</span>
                </button>
                <button onClick={() => navigateTo('profile')}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left hover:bg-gray-50 text-gray-700">
                  <User className="w-5 h-5" />
                  <span>マイページ</span>
                </button>
                <button onClick={() => { setShowProfileEdit(true); setShowMobileMenu(false); }}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left hover:bg-gray-50 text-gray-700">
                  <Edit2 className="w-5 h-5" />
                  <span>プロフィール編集</span>
                </button>
                <hr className="my-2" />
                <button onClick={() => { handleSignOut(); setShowMobileMenu(false); }}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left hover:bg-red-50 text-red-600">
                  <LogOut className="w-5 h-5" />
                  <span>ログアウト</span>
                </button>
              </div>
            ) : (
              <button onClick={() => { setShowAuth(true); setShowMobileMenu(false); }}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gray-900 text-white rounded-full hover:bg-black font-medium transition">
                <User className="w-5 h-5" />
                <span>ログイン / アカウント作成</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ===== ヘッダー (モバイル・md未満のみ) ===== */}
      <header className="md:hidden bg-white/90 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* 左側 */}
            <div className="flex items-center space-x-2">
              {currentView === 'detail' && (
                <button onClick={() => { setCurrentView('list'); window.scrollTo(0, 0); }} className="p-2 hover:bg-gray-100 rounded-full mr-1">
                  <ArrowLeft className="w-5 h-5 text-gray-700" />
                </button>
              )}
              <button onClick={() => navigateTo('list')} className="flex items-center space-x-2 hover:opacity-80 transition">
                <BookOpen className="w-7 h-7 text-gray-900" />
                <span className="hidden sm:block text-xl md:text-2xl font-bold text-gray-900">HOWDEE</span>
                <span className="sm:hidden text-lg font-bold text-gray-900">HOWDEE</span>
              </button>
            </div>

            {/* 中央：検索バー（デスクトップ） */}
            <div className="hidden md:block flex-1 max-w-md mx-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="単語を検索..."
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-transparent" />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full">
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>
            </div>

            {/* 右側：デスクトップナビ */}
            <div className="hidden md:flex items-center space-x-3">
              <button onClick={() => navigateTo('feed')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition ${currentView === 'feed' ? 'font-bold text-gray-900' : 'text-gray-600 hover:bg-gray-100'}`}>
                <Rss className="w-5 h-5" />
                <span>みんなの投稿</span>
              </button>
              {user ? (
                <>
                  <button onClick={() => { setShowFavoritesOnly(!showFavoritesOnly); navigateTo('list'); }}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition ${showFavoritesOnly ? 'font-bold text-red-500' : 'text-gray-600 hover:bg-gray-100'}`}>
                    <Heart className={`w-5 h-5 ${showFavoritesOnly ? 'fill-current' : ''}`} />
                    <span>お気に入り ({favorites.length})</span>
                  </button>
                  <button onClick={() => navigateTo('profile')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition ${currentView === 'profile' ? 'font-bold text-gray-900' : 'text-gray-600 hover:bg-gray-100'}`}>
                    <User className="w-5 h-5" />
                    <span>{profile?.display_name || profile?.username || 'マイページ'}</span>
                  </button>
                  <button onClick={handleSignOut} className="p-2 text-gray-500 rounded-full hover:bg-gray-100 transition">
                    <LogOut className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <button onClick={() => setShowAuth(true)} className="flex items-center space-x-2 px-5 py-2 bg-gray-900 text-white rounded-full text-sm font-medium hover:bg-black transition">
                  <User className="w-5 h-5" />
                  <span>ログイン</span>
                </button>
              )}
            </div>

            {/* 右側：モバイルボタン */}
            <div className="flex md:hidden items-center space-x-2">
              <button onClick={() => setCurrentView(currentView === 'list' ? 'list' : 'list')}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-600" onClick={() => { setShowMobileMenu(false); setCurrentView('list'); }}>
                <Search className="w-5 h-5" onClick={(e) => { e.stopPropagation(); document.getElementById('mobile-search')?.focus(); }} />
              </button>
              <button onClick={() => setShowMobileMenu(true)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-700">
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* モバイル検索バー */}
          <div className="md:hidden mt-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input id="mobile-search" type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="単語を検索..."
                className="w-full pl-9 pr-9 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-transparent text-sm" />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ===== レイアウト ===== */}
      <div className="max-w-[1280px] mx-auto flex items-start justify-center">

        {/* ===== 左サイドバー (md以上で表示) ===== */}
        <div className="hidden md:flex flex-col items-center xl:items-start shrink-0 sticky top-0 h-screen
          w-[68px] xl:w-[260px]
          px-2 xl:px-4 py-2 border-r border-gray-200 bg-white">

          {/* ロゴ */}
          <button onClick={() => navigateTo('list')} className="p-3 hover:bg-gray-100 rounded-full transition mb-1">
            <BookOpen className="w-6 h-6 text-gray-900" />
          </button>

          {/* ナビ */}
          <nav className="flex flex-col items-center xl:items-start w-full space-y-1 mt-1">
            {[
              { view: 'list', icon: <BookOpen className="w-6 h-6 shrink-0" />, label: '単語',
                action: () => navigateTo('list'), active: currentView === 'list' && !showFavoritesOnly },
              { view: 'feed', icon: <Rss className="w-6 h-6 shrink-0" />, label: 'みんなの投稿',
                action: () => navigateTo('feed'), active: currentView === 'feed' },
              { view: 'fav', icon: <Heart className={`w-6 h-6 shrink-0 ${showFavoritesOnly ? 'fill-current text-red-500' : ''}`} />, label: 'お気に入り',
                action: () => { if (user) { setShowFavoritesOnly(!showFavoritesOnly); navigateTo('list'); } else setShowAuth(true); },
                active: showFavoritesOnly },
              { view: 'profile', icon: <User className="w-6 h-6 shrink-0" />, label: user ? (profile?.display_name || profile?.username || 'マイページ') : 'ログイン',
                action: () => { if (user) navigateTo('profile'); else setShowAuth(true); },
                active: currentView === 'profile' },
            ].map(({ view, icon, label, action, active }) => (
              <button key={view} onClick={action}
                className={`flex items-center space-x-4 p-3 rounded-full w-full transition
                  ${active ? 'font-bold text-gray-900' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}>
                {icon}
                <span className="hidden xl:inline text-xl">{label}</span>
              </button>
            ))}
            {user && (
              <button onClick={handleSignOut}
                className="flex items-center space-x-4 p-3 rounded-full w-full text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition">
                <LogOut className="w-6 h-6 shrink-0" />
                <span className="hidden xl:inline text-xl">ログアウト</span>
              </button>
            )}
          </nav>

          {/* ログインボタン (未ログイン時) */}
          {!user && (
            <div className="mt-4 w-full px-1">
              <button onClick={() => setShowAuth(true)}
                className="hidden xl:block w-full py-3 bg-gray-900 text-white rounded-full font-bold text-base hover:bg-black transition">
                ログイン
              </button>
            </div>
          )}

          {/* ユーザーアバター (ログイン時・下部) */}
          {user && (
            <div className="mt-auto mb-4 w-full">
              <div onClick={() => navigateTo('profile')}
                className="flex items-center space-x-3 p-3 rounded-full hover:bg-gray-100 cursor-pointer transition">
                <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-gray-600" />
                </div>
                <div className="hidden xl:block min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{profile?.display_name || profile?.username || 'ユーザー'}</p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ===== メインカラム ===== */}
        <div className="flex-1 min-w-0 max-w-[600px] border-r border-gray-200 bg-white min-h-screen">
          {/* ページタイトル（sticky） */}
          <div className="flex items-center px-4 py-3 border-b border-gray-200 sticky top-0 bg-white/90 backdrop-blur-sm z-10">
            {currentView === 'detail' && (
              <button onClick={() => { setCurrentView('list'); window.scrollTo(0, 0); }} className="p-2 hover:bg-gray-100 rounded-full mr-3 transition">
                <ArrowLeft className="w-5 h-5 text-gray-900" />
              </button>
            )}
            <h1 className="text-xl font-bold text-gray-900">
              {currentView === 'list' ? (showFavoritesOnly ? 'お気に入り' : '単語') :
               currentView === 'feed' ? 'みんなの投稿' :
               currentView === 'profile' ? 'プロフィール' :
               currentView === 'detail' && selectedWord ? selectedWord.word : ''}
            </h1>
          </div>
        <div>

        {/* プロフィールページ */}
        {currentView === 'profile' && user && (
          <div className="px-4 py-4"><ProfilePage user={user} profile={profile} onEditProfile={() => setShowProfileEdit(true)}
            currentUser={user} onLoginRequired={() => setShowAuth(true)} /></div>
        )}

        {/* フィードページ */}
        {currentView === 'feed' && (
          <div>

            {feedLoading ? (
              <p className="text-center text-gray-500 py-12">読み込み中...</p>
            ) : feedPosts.length === 0 ? (
              <div className="text-center py-16">
                <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">まだ投稿がありません</p>
                <p className="text-sm text-gray-400 mt-1">単語の詳細ページから投稿してみましょう！</p>
              </div>
            ) : (
              <div>
                {feedPosts.map(post => (
                  <PostCard key={post.id} post={post} currentUser={user} onDelete={deletePost}
                    onLoginRequired={() => setShowAuth(true)} wordName={post.words?.word} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 単語一覧ページ */}
        {currentView === 'list' && (
          <div>
            <div className="px-4 pt-2 pb-3 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">
                {showFavoritesOnly ? 'お気に入りの単語' : 'すべての単語'}
              </h2>
              <p className="text-gray-400 text-xs">{filteredWords.length}件</p>
            </div>
            {filteredWords.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-500 mb-4">{showFavoritesOnly ? 'お気に入りがありません' : '検索結果がありません'}</p>
                <button onClick={() => { setSearchQuery(''); setShowFavoritesOnly(false); }} className="text-gray-900 hover:text-gray-900 underline">
                  すべて表示
                </button>
              </div>
            ) : (
              <div>
                {filteredWords.map((word) => (
                  <div key={word.id} className="bg-white border-b border-gray-200 hover:bg-gray-50/50 transition">
                    {/* X風：左アイコン＋右コンテンツ */}
                    <div className="flex px-4 pt-4 pb-3 space-x-3">
                      {/* 左：HOWDEEアカウントアイコン（クリックで詳細へ） */}
                      <div className="shrink-0 cursor-pointer" onClick={() => openWordDetail(word)}>
                        <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
                          <BookOpen className="w-5 h-5 text-white" />
                        </div>
                      </div>
                      {/* 右：コンテンツ */}
                      <div className="flex-1 min-w-0">
                        {/* 単語名＋発音記号（クリックで詳細へ） */}
                        <div className="cursor-pointer" onClick={() => openWordDetail(word)}>
                          <div className="flex items-baseline space-x-2 mb-1">
                            <span className="font-bold text-gray-900 text-lg leading-tight">{word.word}</span>
                            {word.pronunciations?.us?.ipa && (
                              <span className="text-gray-400 text-sm">{word.pronunciations.us.ipa}</span>
                            )}
                          </div>
                          {word.meanings?.[0]?.definitions?.[0] && (
                            <p className="text-gray-700 text-sm leading-relaxed line-clamp-2 mb-2">
                              {word.meanings[0].definitions[0].definition}
                            </p>
                          )}
                        </div>
                        {/* 動画（クリックはWordVideoPlayer内で制御） */}
                        {word.youtube_shorts && word.youtube_shorts.length > 0 && (
                          <WordVideoPlayer videoId={word.youtube_shorts[0]} />
                        )}
                        {/* アクションバー */}
                        <div className="flex items-center -ml-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleFavorite(word.id); }}
                            className={`flex items-center space-x-1.5 px-2 py-1.5 rounded-full text-sm transition
                              ${favorites.includes(word.id) ? 'text-red-500 hover:bg-red-50' : 'text-gray-400 hover:bg-red-50 hover:text-red-400'}`}>
                            <Heart className={`w-4 h-4 ${favorites.includes(word.id) ? 'fill-current' : ''}`} />
                            {favorites.includes(word.id) && <span className="text-xs">済み</span>}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 単語詳細ページ */}
        {currentView === 'detail' && selectedWord && (
          <div className="bg-white">

            {/* ① ループ動画（丸型） */}
            {selectedWord.loop_video_url && (
              <div className="flex justify-center pt-6 pb-2">
                <video
                  src={selectedWord.loop_video_url}
                  autoPlay muted loop playsInline
                  className="w-36 h-36 rounded-full object-cover border-2 border-gray-100 shadow-md"
                />
              </div>
            )}

            {/* ① 単語ヘッダー */}
            <div className="px-4 pt-5 pb-4 border-b border-gray-100">
              {/* 単語 + 音声ボタン */}
              <div className="flex items-start justify-between">
                <h2 className="text-4xl font-bold text-gray-900 leading-tight">{selectedWord.word}</h2>
                <button
                  onClick={() => speak(selectedWord.word)}
                  className="p-2 hover:bg-gray-100 rounded-full transition ml-3 flex-shrink-0 mt-1"
                  aria-label="発音を聞く">
                  <Volume2 className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* 屈折形（複数形・過去形など） */}
              {selectedWord.inflections && Object.keys(selectedWord.inflections).length > 0 && (
                <p className="text-gray-400 text-sm mt-1">
                  {Object.entries(selectedWord.inflections)
                    .filter(([, v]) => v)
                    .map(([k, v]) => `${INFLECTION_LABELS[k] || k}: ${v}`)
                    .join(' · ')}
                </p>
              )}

              {/* シェア・お気に入りボタン */}
              <div className="flex items-center space-x-1 mt-3">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href).catch(() => {});
                    setShareCopied(true);
                    setTimeout(() => setShareCopied(false), 2000);
                  }}
                  className="flex items-center space-x-1.5 px-3 py-1.5 hover:bg-gray-100 rounded-full transition text-gray-500 text-sm">
                  <Share2 className="w-4 h-4" />
                  <span>{shareCopied ? 'コピー済み!' : 'シェア'}</span>
                </button>
                <button
                  onClick={() => toggleFavorite(selectedWord.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full transition text-sm ${
                    favorites.includes(selectedWord.id)
                      ? 'text-red-500 hover:bg-red-50'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}>
                  <Heart className={`w-4 h-4 ${favorites.includes(selectedWord.id) ? 'fill-current' : ''}`} />
                  <span>{favorites.includes(selectedWord.id) ? 'お気に入り済み' : 'お気に入り'}</span>
                </button>
              </div>
            </div>

            {/* ② Essential Levels */}
            {selectedWord.necessity_ratings && (
              <div className="mx-4 my-4 p-4 bg-white rounded-2xl border border-gray-200">
                <h3 className="font-bold text-sm text-gray-900 mb-3">
                  Essential Levels{' '}
                  <span className="text-gray-400 font-normal">学習の重要度</span>
                </h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  {[
                    ['アメリカ英語', selectedWord.necessity_ratings.american_conversation],
                    ['イギリス英語', selectedWord.necessity_ratings.british_conversation],
                    ['TOEIC', selectedWord.necessity_ratings.toeic],
                    ['英検', selectedWord.necessity_ratings.eiken],
                  ].map(([label, value]) => value != null && (
                    <div key={label}>
                      <p className="text-xs text-gray-500 mb-1">{label}</p>
                      <div className="flex space-x-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-4 h-4 ${i < value ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ③ 意味カード */}
            {selectedWord.meanings?.map((meaning, idx) => (
              <div key={idx} className="mx-4 mb-4 bg-white rounded-2xl border border-gray-200 overflow-hidden">
                {/* 品詞バッジ */}
                <div className="px-4 pt-4 pb-3 flex items-center space-x-2">
                  <span className="px-3 py-1 bg-gray-900 text-white rounded-full text-sm font-bold">
                    {meaning.part_of_speech}
                  </span>
                  {meaning.part_of_speech_en && (
                    <span className="text-gray-400 text-sm">{meaning.part_of_speech_en}</span>
                  )}
                </div>

                {meaning.definitions?.map((def, defIdx) => (
                  <div key={defIdx} className={`px-4 pb-4 ${defIdx > 0 ? 'border-t border-gray-100 pt-4' : ''}`}>
                    {/* 日本語定義 */}
                    <h4 className="text-xl font-bold text-gray-900 mb-1">{def.definition}</h4>
                    {/* 英語説明（登録単語リンク付き） */}
                    {def.explanation && (
                      <p className="text-gray-500 text-sm leading-relaxed mb-3">
                        {linkifyText(def.explanation, words, openWordDetail)}
                      </p>
                    )}
                    {/* 例文（音声ボタン・登録単語リンク付き） */}
                    {def.examples?.length > 0 && (
                      <div className="space-y-2.5">
                        {def.examples.map((example, exIdx) => {
                          const enText = typeof example === 'object' ? example.en : example;
                          const jaText = typeof example === 'object' ? example.ja : null;
                          return (
                            <div key={exIdx} className="flex items-start space-x-2">
                              <span className="text-gray-300 flex-shrink-0 text-lg leading-tight mt-0.5">·</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-gray-800 text-sm italic">
                                  {linkifyText(enText, words, openWordDetail)}
                                </p>
                                {jaText && <p className="text-gray-400 text-xs mt-0.5">{jaText}</p>}
                              </div>
                              <button
                                onClick={() => speak(enText)}
                                className="flex-shrink-0 p-1 hover:bg-gray-100 rounded-full transition"
                                aria-label="例文を聞く">
                                <Volume2 className="w-4 h-4 text-gray-400" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}

            {/* ④ YouTubeショート */}
            {selectedWord.youtube_shorts?.length > 0 && (
              <div className="mb-4">
                {selectedWord.youtube_shorts.length === 1 ? (
                  /* 1件：中央に縦長表示 */
                  <div className="flex justify-center px-4">
                    <div className="w-52 rounded-2xl overflow-hidden" style={{ aspectRatio: '9/16' }}>
                      <iframe
                        width="100%" height="100%"
                        src={`https://www.youtube.com/embed/${selectedWord.youtube_shorts[0]}?playsinline=1&rel=0`}
                        allow="autoplay; encrypted-media; picture-in-picture"
                        allowFullScreen title="YouTube Short"
                      />
                    </div>
                  </div>
                ) : (
                  /* 複数件：横スクロールスライダー */
                  <div
                    className="flex overflow-x-auto gap-3 px-4 pb-2 snap-x snap-mandatory"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {selectedWord.youtube_shorts.map((vid, i) => (
                      <div key={i} className="flex-shrink-0 w-44 rounded-2xl overflow-hidden snap-start" style={{ aspectRatio: '9/16' }}>
                        <iframe
                          width="100%" height="100%"
                          src={`https://www.youtube.com/embed/${vid}?playsinline=1&rel=0`}
                          allow="autoplay; encrypted-media; picture-in-picture"
                          allowFullScreen title={`YouTube Short ${i + 1}`}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ⑤ Idiom */}
            {selectedWord.idioms?.length > 0 && (
              <div className="mx-4 mb-4 bg-gray-900 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-700 flex items-center space-x-2">
                  <span className="font-bold text-white text-base">Idiom</span>
                  <span className="text-gray-400 text-sm">慣用句</span>
                </div>
                {selectedWord.idioms.map((idiom, idx) => (
                  <div key={idx} className="px-4 py-3 border-b border-gray-800 last:border-0">
                    <div className="flex items-start justify-between space-x-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white text-sm mb-0.5">· {idiom.phrase}</p>
                        {idiom.meaning && (
                          <p className="text-gray-300 text-xs">{idiom.meaning}</p>
                        )}
                        {idiom.example && (
                          <p className="text-gray-400 text-xs italic mt-1">
                            "{linkifyText(idiom.example, words, openWordDetail)}"
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => speak(idiom.example || idiom.phrase)}
                        className="flex-shrink-0 p-1 hover:bg-gray-700 rounded-full transition"
                        aria-label="発音を聞く">
                        <Volume2 className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ⑥ Synonyms */}
            {selectedWord.similar_words?.length > 0 && (
              <div className="mx-4 mb-4">
                <h3 className="font-bold text-base text-gray-900 mb-3">
                  Synonyms <span className="text-gray-400 font-normal text-sm">類似単語</span>
                </h3>
                <div className="grid grid-cols-3 gap-y-2 gap-x-2">
                  {selectedWord.similar_words.map((w, idx) => {
                    const registered = words.find(r => r.word.toLowerCase() === w.toLowerCase());
                    return registered ? (
                      <span key={idx}
                        className="text-blue-500 text-sm cursor-pointer hover:underline"
                        onClick={() => openWordDetail(registered)}>
                        {w}
                      </span>
                    ) : (
                      <span key={idx} className="text-gray-400 text-sm">{w}</span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ⑦ Browse nearby entries */}
            {selectedWord.nearby_words?.length > 0 && (
              <div className="mx-4 mb-4">
                <h3 className="font-bold text-base text-gray-900 mb-3">
                  Browse nearby entries{' '}
                  <span className="text-gray-400 font-normal text-sm">アルファベット順で近い単語</span>
                </h3>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {selectedWord.nearby_words.slice(0, 12).map((w, idx) => {
                    const registered = words.find(r => r.word.toLowerCase() === w.toLowerCase());
                    return registered ? (
                      <span key={idx}
                        className="text-blue-500 text-sm cursor-pointer hover:underline"
                        onClick={() => openWordDetail(registered)}>
                        {w}
                      </span>
                    ) : (
                      <span key={idx} className="text-gray-400 text-sm">{w}</span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SNS投稿セクション */}
            <div className="px-4 py-4 space-y-4 border-t border-gray-100 mt-2">
              <h3 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
                <MessageSquare className="w-5 h-5 text-gray-900" />
                <span>みんなの投稿</span>
                <span className="text-sm font-normal text-gray-500">({wordPosts.length}件)</span>
              </h3>
              <PostForm user={user} onSubmit={createPost} onLoginRequired={() => setShowAuth(true)} />
              {wordPosts.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">まだ投稿がありません。最初の投稿をしてみましょう！</p>
                </div>
              ) : (
                <div>
                  {wordPosts.map(post => (
                    <PostCard key={post.id} post={post} currentUser={user} onDelete={deletePost} onLoginRequired={() => setShowAuth(true)} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        </div>{/* /main-inner */}
        </div>{/* /メインカラム */}

        {/* ===== 右サイドバー (lg以上で表示) ===== */}
        <div className="hidden lg:block shrink-0 w-[290px] xl:w-[350px] px-4 xl:px-6 py-4 sticky top-0 h-screen overflow-y-auto bg-white border-l border-gray-200">
          {/* 検索ボックス */}
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="単語を検索..."
              className="w-full pl-11 pr-9 py-2.5 bg-gray-100 border-0 rounded-full text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:bg-white transition-colors" />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
          {/* 統計カード */}
          <div className="bg-gray-50 rounded-2xl p-4 mb-4">
            <h3 className="text-lg font-bold text-gray-900 mb-3">HOWDEE</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm">単語数</span>
                <span className="font-bold text-gray-900 text-sm">{words.length}</span>
              </div>
              {user && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">お気に入り</span>
                  <span className="font-bold text-gray-900 text-sm">{favorites.length}</span>
                </div>
              )}
            </div>
          </div>
          {/* 未ログイン時 */}
          {!user && (
            <div className="bg-gray-50 rounded-2xl p-4">
              <h3 className="text-lg font-bold text-gray-900 mb-1">HOWDEEに参加しよう</h3>
              <p className="text-gray-500 text-sm mb-4">お気に入り登録・投稿・コメントができます</p>
              <button onClick={() => { setIsSignUp(true); setShowAuth(true); }}
                className="w-full py-2.5 bg-gray-900 text-white rounded-full font-bold text-sm hover:bg-black transition mb-2">
                アカウント作成
              </button>
              <button onClick={() => { setIsSignUp(false); setShowAuth(true); }}
                className="w-full py-2.5 border border-gray-300 text-gray-700 rounded-full font-bold text-sm hover:bg-gray-50 transition">
                ログイン
              </button>
            </div>
          )}
        </div>

      </div>{/* /3カラムレイアウト */}

      {/* ===== モバイルボトムナビ (md未満) ===== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30">
        <div className="grid grid-cols-4 h-14">
          <button onClick={() => navigateTo('list')}
            className={`flex flex-col items-center justify-center space-y-0.5 transition ${currentView === 'list' && !showFavoritesOnly ? 'text-black' : 'text-gray-400'}`}>
            <BookOpen className="w-5 h-5" />
            <span className="text-xs">単語</span>
          </button>
          <button onClick={() => navigateTo('feed')}
            className={`flex flex-col items-center justify-center space-y-0.5 transition ${currentView === 'feed' ? 'text-black' : 'text-gray-400'}`}>
            <Rss className="w-5 h-5" />
            <span className="text-xs">投稿</span>
          </button>
          <button onClick={() => { if (user) { setShowFavoritesOnly(!showFavoritesOnly); navigateTo('list'); } else setShowAuth(true); }}
            className={`flex flex-col items-center justify-center space-y-0.5 transition ${showFavoritesOnly ? 'text-red-500' : 'text-gray-400'}`}>
            <Heart className={`w-5 h-5 ${showFavoritesOnly ? 'fill-current' : ''}`} />
            <span className="text-xs">お気に入り</span>
          </button>
          <button onClick={() => { if (user) navigateTo('profile'); else setShowAuth(true); }}
            className={`flex flex-col items-center justify-center space-y-0.5 transition ${currentView === 'profile' ? 'text-black' : 'text-gray-400'}`}>
            <User className="w-5 h-5" />
            <span className="text-xs">{user ? 'マイページ' : 'ログイン'}</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

export default App;
