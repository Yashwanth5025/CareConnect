import React, { useState, useEffect } from 'react';
import { ArrowLeft, ShoppingCart, Trash2, User, MapPin, Calendar, Ruler, Weight, Footprints, Shirt, X } from 'lucide-react';
import axios from 'axios';

const Cart = () => {
  const [cartPlayers, setCartPlayers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [scoutId, setScoutId] = useState('');

  useEffect(() => {
    const username = localStorage.getItem('chatUsername');
    setScoutId(username || '');
  }, []);

  useEffect(() => {
    const loadCart = async () => {
      if (!scoutId) {
        setIsLoading(false);
        return;
      }
      try {
        const response = await axios.get(`http://localhost:5501/cart/${scoutId}`);
        setCartPlayers(response.data.players || []);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading cart:', error);
        setCartPlayers([]);
        setIsLoading(false);
      }
    };
    loadCart();
  }, [scoutId]);

  const removeFromCart = async (player) => {
    if (!scoutId) return;
    try {
      // The backend expects playerId or name for deletion
      // Make sure we're using the correct property that matches what's stored in the database
      const playerId = player.playerId || player.name;
      
      console.log('Removing player with ID:', playerId);
      
      // Make the delete request
      const response = await axios.delete(`http://localhost:5501/cart/${scoutId}/remove/${playerId}`);
      
      if (response.status === 200) {
        // Refresh the cart data from the server to ensure we have the latest state
        const updatedCart = await axios.get(`http://localhost:5501/cart/${scoutId}`);
        setCartPlayers(updatedCart.data.players || []);
      }
    } catch (error) {
      console.error('Error removing player from cart:', error);
      alert('Failed to remove player from cart. Please try again.');
    }
  };

  const clearCart = async () => {
    if (!scoutId) return;
    try {
      await axios.delete(`http://localhost:5501/cart/${scoutId}/clear`);
      setCartPlayers([]);
    } catch (error) {
      console.error('Error clearing cart:', error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#e3f2fd] to-[#f3e5f5] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading cart...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
    <div className="min-h-screen bg-gradient-to-br from-[#e3f2fd] to-[#f3e5f5] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.history.back()}
              className="p-2 hover:bg-gray-200 rounded-full"
              title="Go Back"
            >
              <ArrowLeft className="w-6 h-6 text-black" />
            </button>

            <span className="bg-green-200 text-green-600 rounded-full p-3">
              <ShoppingCart className="w-8 h-8" />
            </span>
            <div>
              <h1 className="text-3xl font-bold text-[#19325F]">My Cart</h1>
              <p className="text-gray-600">
                {cartPlayers.length} {cartPlayers.length === 1 ? 'player' : 'players'} in your cart
              </p>
            </div>
          </div>

          {cartPlayers.length > 0 && (
            <button
              onClick={clearCart}
              className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition duration-200 flex items-center gap-2"
            >
              <Trash2 className="w-5 h-5" />
              Clear Cart
            </button>
          )}
        </div>

        {/* Rest of your component unchanged */}
        {!scoutId ? (
          <div className="text-center py-20">
            <div className="text-gray-400 mb-6">
              <User className="w-24 h-24 mx-auto" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-600 mb-4">Please Login</h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              You need to be logged in as a Scout to view your cart. Please login to access your saved players.
            </p>
            <a
              href="/login"
              className="inline-block bg-[#19325F] text-white px-8 py-3 rounded-lg hover:bg-[#2a4a6b] transition duration-200"
            >
              Login
            </a>
          </div>
        ) : cartPlayers.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-gray-400 mb-6">
              <ShoppingCart className="w-24 h-24 mx-auto" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-600 mb-4">Your cart is empty</h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              Start adding players to your cart by browsing the player market and clicking "Add to Cart" on any player you're interested in.
            </p>
            <a
              href="/Scoutmar"
              className="inline-block bg-[#19325F] text-white px-8 py-3 rounded-lg hover:bg-[#2a4a6b] transition duration-200"
            >
              Browse Players
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {cartPlayers.map((player) => (
              <div
                key={player.id}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition duration-300 transform hover:-translate-y-1"
              >
                <div className="relative">
                  <img
                    src={player.image_url || 'https://via.placeholder.com/300x200?text=Player+Image'}
                    alt={player.name}
                    className="w-full h-48 object-cover"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/300x200?text=Player+Image';
                    }}
                  />
                  <button
                    onClick={() => removeFromCart(player)}
                    className="absolute top-3 right-3 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition duration-200"
                    title="Remove from cart"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-sm font-medium">
                    {player.position}
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="text-xl font-bold text-[#19325F] mb-2">{player.name}</h3>
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-500" />
                      <span>{player.team_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-green-500" />
                      <span>{player.country}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-purple-500" />
                      <span>{player.age} years old</span>
                    </div>
                  </div>

                  <div className="border-t pt-3">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Physical Attributes</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <Ruler className="w-3 h-3 text-orange-500" />
                        <span>{player.height}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Weight className="w-3 h-3 text-orange-500" />
                        <span>{player.weight}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Footprints className="w-3 h-3 text-orange-500" />
                        <span>{player.foot}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Shirt className="w-3 h-3 text-orange-500" />
                        <span>#{player.jersey}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-gray-500">
                      Added on {formatDate(player.addedAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {cartPlayers.length > 0 && (
          <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Cart Summary</h3>
                <p className="text-gray-600">
                  {cartPlayers.length} {cartPlayers.length === 1 ? 'player' : 'players'} selected
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Total Players</p>
                <p className="text-2xl font-bold text-[#19325F]">{cartPlayers.length}</p>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default Cart;