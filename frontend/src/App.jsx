
//1 base example

// import React, { useState, useEffect, useCallback } from 'react';
// import { throttle } from 'lodash';
// import './App.css';


// const generateDummyData = (start, end) => {
//   const data = [];
//   for (let i = start; i <= end; i++) {
//     data.push(`Item ${i}`);
//   }
//   return data;
// };

// // Simulate an API call
// const fetchMoreData = (start, end) => {
//   return new Promise((resolve) => {
//     setTimeout(() => {
//       const data = [];
//       for (let i = start; i <= end; i++) {
//         data.push(`Item ${i}`);
//       }
//       resolve(data);
//     }, 1000); // Simulating network latency
//   });
// };

// function App() {
//   const [items, setItems] = useState(() => generateDummyData(1, 20));
//   const [isLoading, setIsLoading] = useState(false);

//   const loadMoreItems = useCallback(() => {
//     if (isLoading) return;

//     setIsLoading(true);
//     fetchMoreData(items.length + 1, items.length + 20).then((newItems) => {
//       setItems((prevItems) => [...prevItems, ...newItems]);
//       setIsLoading(false);
//     });
//   }, [isLoading, items]);

//   const handleScroll = useCallback(
//     throttle(() => {
//       if (window.innerHeight + document.documentElement.scrollTop + 50 >= document.documentElement.scrollHeight) {
//         loadMoreItems();
//       }
//     }, 200),
//     [loadMoreItems]
//   );

//   useEffect(() => {
//     window.addEventListener('scroll', handleScroll);
//     return () => window.removeEventListener('scroll', handleScroll);
//   }, [handleScroll]);

//   return (
//     <div className="App">
//       <h1>Infinite Scroll with Throttling and Simulated API Call</h1>
//       <div className="items">
//         {items.map((item, index) => (
//           <div key={index} className="item">
//             {item}
//           </div>
//         ))}
//       </div>
//       {isLoading && <p>Loading more items...</p>}
//     </div>
//   );
// }

// export default App;

//2 actual implementation

// The logic flow:

// When the component mounts, the first useEffect runs, loading the initial set of items.
// The second useEffect also runs, adding the scroll event listener.
// As the user scrolls, the handleScroll function is called.
// If the user scrolls to the bottom, handleScroll will call loadMoreItems() to fetch more data.
// If the component updates in a way that changes handleScroll, the second useEffect will run again, removing the old listener and adding a new one.
// When the component unmounts, the cleanup function in the second useEffect runs, removing the scroll event listener.

// This setup ensures that:

// We always have data to display (from the initial load).
// We're always listening for scroll events with the most up-to-date version of handleScroll.
// We clean up properly to avoid memory leaks


// The main purpose of initialLoadDone is to prevent the scroll handler from triggering additional data loads before the initial data has been fetched and rendered. This is crucial for several reasons:
// a. Preventing premature loads: When the component first mounts, there might not be enough content to fill the page. Without this check, the scroll condition might be immediately satisfied, triggering multiple unnecessary data loads.
// b. Ensuring stable initial render: It allows the initial set of items to be fully loaded and rendered before enabling the infinite scroll behavior.
// c. Avoiding race conditions: It prevents potential issues where scroll-triggered loads might interfere with the initial data load.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { throttle } from 'lodash';
import './App.css';

const fetchMoreData = async (query, from) => {
  // Simulating a delay in the API call
  await new Promise(resolve => setTimeout(resolve, 1000));
  const response = await fetch(`http://localhost:5000/products/search?query=${query}&from=${from}`);
  const data = await response.json();
  return data;
};

const App = () => {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState('game');
  const [from, setFrom] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  // initialLoadDone is created using useRef, which means its value persists across re-renders without causing re-renders when it changes.
  const initialLoadDone = useRef(false);


  //load more items function
  const loadMoreItems = useCallback(async () => {
    //if the loading is happening or there is no data to show, just return
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    
    try {
      const newItems = await fetchMoreData(query, from);

      //if the api call returns empty array, all the data has been returned, make hasMore=false
      if (newItems.length === 0) {
        setHasMore(false);
      } else {
        setItems((prevItems) => [...prevItems, ...newItems]);
        setFrom((prevFrom) => prevFrom + newItems.length);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setHasMore(false);
    } finally {
      // After the initial load of items (or any subsequent load), initialLoadDone.current is set to true. This indicates that at least one batch of data has been loaded.
      setIsLoading(false);
      //ensures at least one attempt of loading the state has been made
      initialLoadDone.current = true;
    }
  }, [isLoading, query, from, hasMore]);


  //handle scroll function
  const handleScroll = useCallback(
    throttle(() => {
      // This line prevents the scroll handler from executing if the initial load hasn't completed. 
      if (!initialLoadDone.current) return;

      // This gets the number of pixels that have been scrolled vertically.
      // It first tries to get this value from document.documentElement.scrollTop (for most modern browsers).
      // If that's not available, it falls back to document.body.scrollTop (for older browsers).
      const scrollTop = (document.documentElement && document.documentElement.scrollTop) || document.body.scrollTop;


      // This gets the total height of the entire document, including parts not visible on the screen.
      const scrollHeight = (document.documentElement && document.documentElement.scrollHeight) || document.body.scrollHeight;

      // This gets the height of the viewport (the visible part of the page).
      const clientHeight = document.documentElement.clientHeight || window.innerHeight;

        //calculate if scrolled to bottom
        // scrollTop + clientHeight gives us the total number of pixels from the top of the document to the bottom of the current viewport.
        // If this sum is greater than or equal to scrollHeight, it means we've scrolled to the bottom of the document.
        // Math.ceil() is used to round up, ensuring we don't miss the bottom due to fractional pixel values.

        //         +-------------------+
        // |                   |
        // |    scrollTop      |
        // |                   |
        // +-------------------+ <-- Current viewport position
        // |                   |
        // |   clientHeight    |
        // |                   |
        // +-------------------+ <-- Bottom of viewport
        // |                   |
        // |                   |
        // +-------------------+ <-- Bottom of document (scrollHeight)
      const scrolledToBottom = Math.ceil(scrollTop + clientHeight) >= scrollHeight;

      //if scrolled to bottom, then load more items provided the api has more results and the loading state is not true 
      if (scrolledToBottom && !isLoading && hasMore) {
        loadMoreItems();
      }
    }, 200),
    [loadMoreItems, isLoading, hasMore]
  );

  useEffect(() => {
    loadMoreItems();
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return (
    <div className="App">
      <h1>Infinite Scroll with Throttling and API Calls</h1>
      <div className="items">
        {items.map((item, index) => (
          <div key={index} className="item">
            <h2>{item.name}</h2>
            <p>{item.description}</p>
            <p>${item.price}</p>
          </div>
        ))}
      </div>
      {isLoading && <p>Loading more items...</p>}
      {!isLoading && !hasMore && <p>No more items to load</p>}
    </div>
  );
};

export default App;