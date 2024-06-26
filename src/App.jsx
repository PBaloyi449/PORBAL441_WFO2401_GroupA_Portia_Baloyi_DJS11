import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import './index.css'; // Import Tailwind CSS
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import Carousel from "./components/SlidingCorousel";
import Header from './components/Header';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar'; // Import the Sidebar component
import { FavoritesProvider } from './components/FavoriteEpisodes';
import Fuse from 'fuse.js'; // Import Fuse.js
import { genres } from './components/genre.js'; // Import genre data

// Lazy-loaded components
const PodcastDetail = lazy(() => import('./components/PodcastDetails'));
const FavoritesPage = lazy(() => import('./components/FavoritesPage'));

function App() {
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('A-Z'); // State for filter
  const [searchQuery, setSearchQuery] = useState('');

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch podcast data
        const response = await fetch('https://podcast-api.netlify.app');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        if (!Array.isArray(data)) {
          throw new Error('Data is not an array');
        }

        const extractedData = data.map(show => {
          const {
            id = '',
            image = '',
            title = 'No Title',
            description = 'No Description',
            seasons = 0,
            genres: showGenres = [],
            updated = 'Unknown Date'
          } = show;

          const genreDetails = showGenres.map(id => ({
            id,
            title: genres[id] || 'Unknown Genre'
          }));

          const formattedUpdated = new Date(updated).toLocaleDateString('en-UK', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          });

          return { id, image, title, description, seasons, genres: genreDetails, updated: formattedUpdated };
        });

        setShows(extractedData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error.message);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filterShows = (shows, filter) => {
    switch (filter) {
      case 'A-Z':
        return [...shows].sort((a, b) => a.title.localeCompare(b.title));
      case 'Z-A':
        return [...shows].sort((a, b) => b.title.localeCompare(a.title));
      case 'Newest':
        return [...shows].sort((a, b) => new Date(b.updated) - new Date(a.updated));
      case 'Oldest':
        return [...shows].sort((a, b) => new Date(a.updated) - new Date(b.updated));
      case 'Genres':
        return shows;
      default:
        // Filter by genre
        return shows.filter(show => show.genres.some(genre => genre.title === filter));
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const fuse = new Fuse(shows, {
    keys: ['title'],
    threshold: 0.3
  });

  const searchResults = searchQuery ? fuse.search(searchQuery).map(result => result.item) : shows;
  const filteredShows = filterShows(searchResults, filter);

  // Select 5 random shows
  const getRandomShows = (shows, count) => {
    const shuffled = [...shows].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  };

  const randomShows = getRandomShows(shows, 5);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error fetching data: {error}</div>;
  }

  return (
    <FavoritesProvider>
      <div className="font-sans bg-gray-100 min-h-screen flex">
        <Sidebar isOpen={isOpen} toggleSidebar={toggleSidebar} />
        <div className="flex-1">
          <Header onSearch={handleSearch} />
          {!isOpen && (
            <button 
              className="absolute top-30 left-0 m-4 text-gray-600"
              onClick={toggleSidebar}
            >
              👁️👁️
            </button>
          )}
          <div className="w-[60%] m-auto pt-11">
            <Carousel casts={randomShows} />
          </div>
          <Navbar setFilter={setFilter} />
          <Suspense fallback={<div>Loading...</div>}>
            <Routes>
              <Route path="/" element={
                <div className="podcast-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5 p-5">
                  {filteredShows.map((show, index) => (
                    <div key={index} className="podcast bg-white p-4">
                      <Link to={`/podcast/${show.id}`}>
                        <img src={show.image} alt={show.title} className="w-full h-auto mb-4 rounded" />
                        <h3 className="my-2 text-xl font-bold overflow-hidden whitespace-nowrap overflow-ellipsis text-black">{show.title}</h3>
                      </Link>
                      <p><strong>Seasons:</strong> {show.seasons}</p>
                      <p className="truncate"><strong>Genres:</strong> 
                        {show.genres.map((genre, index) => (
                          <span key={index}>
                            {genre.title}
                            {index < show.genres.length - 1 ? ', ' : ''}
                          </span>
                        ))}
                      </p>
                      <p><strong>Last updated:</strong> {show.updated}</p>
                    </div>
                  ))}
                </div>
              } />
              <Route path="/podcast/:id" element={<PodcastDetail shows={shows} />} />
              <Route path="/favorites" element={<FavoritesPage filter={filter} />} />
            </Routes>
          </Suspense>
        </div>
      </div>
    </FavoritesProvider>
  );
}

export default App;


