#!/bin/bash

# Demo script for Claude Code CLI style multi-line input in Bruno

echo "🤖 Bruno CLI - Claude Code Style Demo"
echo "======================================"
echo ""
echo "This demo shows how Bruno now handles multi-line input just like Claude Code CLI"
echo ""

# Demo 1: Multi-line shell script
echo "📝 Demo 1: Multi-line Shell Script"
echo "Paste this entire block into Bruno:"
echo ""
cat << 'DEMO1'
echo "Setting up a Node.js project..."
mkdir -p my-app/src/components
cd my-app
npm init -y
npm install express cors dotenv
cat > src/index.js << 'EOF'
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({ message: 'Hello from Bruno!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
EOF
node src/index.js
DEMO1

echo ""
echo "---"
echo ""

# Demo 2: Natural language with code
echo "📝 Demo 2: Natural Language Request"
echo "Paste this into Bruno:"
echo ""
cat << 'DEMO2'
Create a React component for a user profile card that displays:
- User avatar (with fallback to initials)
- Full name
- Email address
- Bio with "Read more" toggle for long text
- Social media links (Twitter, GitHub, LinkedIn)

Use Tailwind CSS for styling and make it responsive.
DEMO2

echo ""
echo "---"
echo ""

# Demo 3: Mixed content
echo "📝 Demo 3: Mixed Content (Explanation + Commands)"
echo "Paste this into Bruno:"
echo ""
cat << 'DEMO3'
I need to deploy my app to production. First, let me check the current status:

git status
git log --oneline -5

Now I'll build and deploy:

npm run build
docker build -t myapp:latest .
docker push myapp:latest
kubectl apply -f k8s/deployment.yaml
kubectl rollout status deployment/myapp

Finally, verify the deployment:

curl https://api.myapp.com/health
DEMO3

echo ""
echo "---"
echo ""

# Demo 4: Complex multi-file creation
echo "📝 Demo 4: Creating Multiple Files"
echo "Paste this into Bruno:"
echo ""
cat << 'DEMO4'
Setting up a complete Express API with authentication...

mkdir -p api/{routes,middleware,models,utils}

cat > api/models/User.js << 'EOF'
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

userSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);
EOF

cat > api/middleware/auth.js << 'EOF'
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied' });
  }
  
  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid token' });
  }
};
EOF

cat > api/routes/auth.js << 'EOF'
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword });
    
    await user.save();
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    const validPassword = await user.comparePassword(password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
EOF

npm install express mongoose bcryptjs jsonwebtoken dotenv
DEMO4

echo ""
echo "---"
echo ""

echo "🎯 Key Features Demonstrated:"
echo "  ✅ No special commands needed - just paste and go"
echo "  ✅ Automatic multi-line detection"
echo "  ✅ Heredoc support for file creation"
echo "  ✅ Mixed natural language and code"
echo "  ✅ Real-time command execution"
echo ""
echo "To try these demos:"
echo "1. Run: ./bin/bruno.js --claude"
echo "2. Copy and paste any demo block above"
echo "3. Watch Bruno handle it seamlessly!"
echo ""