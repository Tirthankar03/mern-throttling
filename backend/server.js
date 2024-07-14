import express from 'express'
import mongoose from 'mongoose';
import cors from 'cors'
const app = express();
const PORT = process.env.PORT || 5000;


// Enable CORS for all origins
app.use(cors());

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/infinite_scroll', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Product Schema
const productSchema = new mongoose.Schema({
  name: String,
  description: String,
  price: Number,
  category: String
});

const Product = mongoose.model('Product', productSchema);

// Seed Database with dummy data (only once)
const seedDatabase = async () => {
  const products = Array.from({ length: 100 }, (_, i) => ({
    name: `Product ${i + 1}`,
    description: `Description for product ${i + 1}`,
    price: (i + 1) * 10,
    category: 'Category A'
  }));

  await Product.insertMany(products);
  console.log('Database seeded');
};

// Uncomment the following line to seed the database
// seedDatabase();

app.use(express.json());

// Endpoint to get products
app.get('/products/search', async (req, res) => {
//   const { query, from = 0, limit = 9 } = req.query;
//   const searchQuery = query ? { name: new RegExp(query, 'i') } : {};
const { from = 0, limit = 9 } = req.query;
  try {
    const products = await Product.find()
      .skip(parseInt(from))
      .limit(parseInt(limit));

    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
