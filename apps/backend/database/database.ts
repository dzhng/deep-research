import { Sequelize, DataTypes, Model } from 'sequelize';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { generateUserId, generateApiKey } from '../services/keyGenerator';

// Initialize Sequelize with SQLite
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'database.sqlite'),
  logging: console.log, // Enable SQL query logging
});

// Define User model
class User extends Model {
  declare id: number;
  declare userId: string;
  declare username: string;
  declare apiKey: string;
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    apiKey: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
  },
);

// Sync database
sequelize.sync();

// Create a new user
async function createUser(username: string, apiKey: string): Promise<User> {
  return await User.create({ username, apiKey });
}

// Get a user by ID
async function getUserById(id: number): Promise<User | null> {
  return await User.findByPk(id);
}

// Update a user's API key
async function updateUserApiKey(id: number, newApiKey: string): Promise<void> {
  const user = await User.findByPk(id);
  if (user) {
    user.apiKey = newApiKey;
    await user.save();
  }
}

// Delete a user by ID
async function deleteUser(id: number): Promise<void> {
  const user = await User.findByPk(id);
  if (user) {
    await user.destroy();
  }
}

// Generate a user ID and API key, and store them in the database
async function generateApiKeyForUser(username: string): Promise<User> {
  console.log('Generating API key for user:', username);
  const userId = generateUserId(username);
  const apiKey = generateApiKey();
  
  console.log('Creating user in database...');
  const user = await User.create({
    userId,
    username,
    apiKey
  });
  
  console.log('User created successfully:', {
    id: user.get('id'),
    userId: user.get('userId'),
    username: user.get('username'),
    apiKey: user.get('apiKey')
  });
  
  return user;
}

export { sequelize, User, createUser, getUserById, updateUserApiKey, deleteUser, generateApiKeyForUser }; 