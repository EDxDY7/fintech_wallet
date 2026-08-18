const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Wallet, sequelize } = require('../../database/models');

class AuthService {
  static generateToken(user) {
    return jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'super_secret_jwt_key_12345',
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );
  }

  static async register({ name, email, password, role }) {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      const error = new Error('Email is already registered');
      error.statusCode = 400;
      throw error;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const t = await sequelize.transaction();
    try {
      const user = await User.create(
        {
          name,
          email,
          password: hashedPassword,
          role: role || 'user',
        },
        { transaction: t }
      );

      const wallet = await Wallet.create(
        {
          userId: user.id,
          availableBalance: 0.0,
          lockedBalance: 0.0,
        },
        { transaction: t }
      );

      await t.commit();

      const token = this.generateToken(user);
      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        wallet: {
          id: wallet.id,
          availableBalance: wallet.availableBalance,
          lockedBalance: wallet.lockedBalance,
        },
        token,
      };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  static async login({ email, password }) {
    const user = await User.findOne({
      where: { email },
      include: [{ model: Wallet, as: 'wallet' }],
    });

    if (!user) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }
    const token = this.generateToken(user);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      wallet: user.wallet
        ? {
            id: user.wallet.id,
            availableBalance: user.wallet.availableBalance,
            lockedBalance: user.wallet.lockedBalance,
          }
        : null,
      token,
    };
  }
}

module.exports = AuthService;
