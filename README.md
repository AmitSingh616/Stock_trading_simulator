# Virtual Stock Trading Simulation System

A full-stack stock market simulation platform built for a **DBMS Lab Project — Manipal Institute of Technology**.

This system allows users to trade stocks using **virtual currency**, track portfolio performance, and experience realistic market fluctuations without financial risk.

---

# Features

* User registration and login
* Virtual starting balance of **$100,000**
* Real-time simulated stock price updates
* Buy and sell stocks
* Limit orders, stop loss, and take profit
* Portfolio tracking
* Watchlist system
* Portfolio performance analytics
* Historical stock price charts
* Background price engine updating prices every **20 seconds**

---

# Tech Stack

### Backend

* Python
* Flask
* Flask-APScheduler
* MySQL Connector

### Database

* MySQL

### Frontend

* HTML
* CSS
* Bootstrap
* JavaScript
* Chart.js

---

# System Architecture

Frontend (Port 3000)
↓
Flask Backend API (Port 5000)
↓
MySQL Database

Stock prices are automatically updated by a **background price engine** running every 20 seconds.

---

# Project Structure

```
virtual-trading-sim
│
├── app.py
├── config.py
├── requirements.txt
│
├── routes
├── services
├── models
├── scheduler
│
├── db
│   ├── db_init.sql
│   ├── triggers.sql
│   └── seed_data.sql
│
└── frontend
    ├── index.html
    ├── login.html
    ├── register.html
    ├── css
    └── js
```

---

# How to Run the Project

## 1. Clone the Repository

```
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME
```

---

# 2. Create Virtual Environment

```
python -m venv venv
```

Activate (Windows):

```
venv\Scripts\activate
```

---

# 3. Install Dependencies

```
pip install -r requirements.txt
```

---

# 4. Setup MySQL Database

Open MySQL Workbench and create a database:

```
virtual_trading
```

Then run these SQL files:

```
db/db_init.sql
db/triggers.sql
db/seed_data.sql
```

This will:

* Create all tables
* Install triggers
* Insert 50 companies

---

# 5. Configure Environment Variables

Create a file:

```
.env
```

Add:

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=virtual_trading
SECRET_KEY=dev_secret_key
PRICE_ENGINE_INTERVAL=20
```

---

# 6. Start Backend

```
python app.py
```

Backend runs at:

```
http://localhost:5000
```

The price engine will start automatically.

---

# 7. Start Frontend

Open a new terminal and run:

```
cd frontend
python -m http.server 3000
```

Open in browser:

```
http://localhost:3000
```

---

# How the Simulation Works

Every 20 seconds the system:

1. Updates stock prices
2. Stores price history
3. Checks pending orders
4. Executes triggered trades
5. Updates portfolio snapshots

Volatility tiers:

* Stable → ±0.5%
* Normal → ±2%
* Volatile → ±5%

---

# Database Design

The database uses a normalized schema with the following tables:

* users
* stocks
* stock_prices_history
* transactions
* portfolios
* pending_orders
* watchlists
* portfolio_snapshots

MySQL triggers automatically update:

* User balances
* Portfolio holdings

when trades occur.

---

# API Endpoints

### Auth

```
POST /api/auth/register
POST /api/auth/login
GET /api/auth/me
```

### Stocks

```
GET /api/stocks
GET /api/stocks/<symbol>
GET /api/stocks/<symbol>/history
```

### Trading

```
POST /api/trading/buy
POST /api/trading/sell
```

### Orders

```
POST /api/orders/create
GET /api/orders
DELETE /api/orders/<id>
```

### Portfolio

```
GET /api/portfolio
GET /api/transactions
GET /api/portfolio/history
```

### Watchlist

```
POST /api/watchlist/add
DELETE /api/watchlist/remove
GET /api/watchlist
```

### Analytics

```
GET /api/analytics/networth
GET /api/analytics/performance
```

---

# Demo Flow

1. Register a new user
2. Login
3. Add stocks to watchlist
4. Buy stocks
5. Observe price updates
6. Show portfolio growth
7. Demonstrate limit order or stop loss

---

# Project

DBMS Lab Project
Manipal Institute of Technology
