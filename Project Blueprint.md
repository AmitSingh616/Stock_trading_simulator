\# Project Blueprint: Virtual Stock Trading Simulation System



\## 📂 Database Schema (MySQL)



\### 1. users (Entity)

\* \*\*id\*\*: INT AUTO\_INCREMENT (Primary Key)

\* \*\*username\*\*: VARCHAR(50) UNIQUE

\* \*\*email\*\*: VARCHAR(100) UNIQUE

\* \*\*password\_hash\*\*: VARCHAR(255) (Scrambled password for security)

\* \*\*virtual\_balance\*\*: DECIMAL(15, 2) (Default: 100,000.00)

\* \*\*created\_at\*\*: TIMESTAMP DEFAULT CURRENT\_TIMESTAMP



\### 2. stocks (Entity)

\* \*\*id\*\*: INT AUTO\_INCREMENT (Primary Key)

\* \*\*symbol\*\*: VARCHAR(10) UNIQUE (e.g., AAPL, TSLA)

\* \*\*company\_name\*\*: VARCHAR(100)

\* \*\*current\_price\*\*: DECIMAL(15, 2)

\* \*\*volatility\_tier\*\*: ENUM('STABLE', 'NORMAL', 'VOLATILE') (Determines price swing range)



\### 3. stock\_prices\_history (Weak Entity)

\* \*\*id\*\*: BIGINT AUTO\_INCREMENT (Primary Key)

\* \*\*stock\_id\*\*: INT (Foreign Key -> stocks.id)

\* \*\*price\*\*: DECIMAL(15, 2)

\* \*\*recorded\_at\*\*: TIMESTAMP DEFAULT CURRENT\_TIMESTAMP



\### 4. transactions (Relation)

\* \*\*id\*\*: INT AUTO\_INCREMENT (Primary Key)

\* \*\*user\_id\*\*: INT (Foreign Key -> users.id)

\* \*\*stock\_id\*\*: INT (Foreign Key -> stocks.id)

\* \*\*type\*\*: ENUM('BUY', 'SELL')

\* \*\*quantity\*\*: INT

\* \*\*price\_at\_transaction\*\*: DECIMAL(15, 2)

\* \*\*total\_amount\*\*: DECIMAL(15, 2) (Quantity \* Price)

\* \*\*created\_at\*\*: TIMESTAMP DEFAULT CURRENT\_TIMESTAMP



\### 5. portfolios (Relation)

\* \*\*user\_id\*\*: INT (Foreign Key -> users.id)

\* \*\*stock\_id\*\*: INT (Foreign Key -> stocks.id)

\* \*\*quantity\_held\*\*: INT

\* \*\*avg\_purchase\_price\*\*: DECIMAL(15, 2) (To calculate Profit/Loss)

\* \*\*Primary Key\*\*: Composite (user\_id, stock\_id)



\### 6. pending\_orders (Relation)

\* \*\*id\*\*: INT AUTO\_INCREMENT (Primary Key)

\* \*\*user\_id\*\*: INT (Foreign Key -> users.id)

\* \*\*stock\_id\*\*: INT (Foreign Key -> stocks.id)

\* \*\*order\_type\*\*: ENUM('LIMIT\_BUY', 'STOP\_LOSS', 'TAKE\_PROFIT')

\* \*\*trigger\_price\*\*: DECIMAL(15, 2) (Price that activates the trade)

\* \*\*quantity\*\*: INT

\* \*\*status\*\*: ENUM('PENDING', 'EXECUTED', 'CANCELLED')

\* \*\*created\_at\*\*: TIMESTAMP DEFAULT CURRENT\_TIMESTAMP



\### 7. watchlists (Relation)

\* \*\*user\_id\*\*: INT (Foreign Key -> users.id)

\* \*\*stock\_id\*\*: INT (Foreign Key -> stocks.id)

\* \*\*Primary Key\*\*: Composite (user\_id, stock\_id)



\### 8. portfolio\_snapshots (Weak Entity)

\* \*\*id\*\*: INT AUTO\_INCREMENT (Primary Key)

\* \*\*user\_id\*\*: INT (Foreign Key -> users.id)

\* \*\*total\_value\*\*: DECIMAL(15, 2) (Cash + Total Asset Value)

\* \*\*snapshot\_date\*\*: TIMESTAMP DEFAULT CURRENT\_TIMESTAMP



\---



\## ⚙️ Core Logic \& Automation



\### 1. The Price Engine (Python Background Task)

Every 20 seconds, the backend updates the current\_price using these tiers:

\* STABLE: New Price = Old Price \* (1 +/- 0.5%)

\* NORMAL: New Price = Old Price \* (1 +/- 2.0%)

\* VOLATILE: New Price = Old Price \* (1 +/- 5.0%)



\*Note: Immediately after update, the engine logs the new price to stock\_prices\_history.\*



\### 2. Order Execution Logic

After each price update, the system checks pending\_orders:

\* LIMIT\_BUY: If current\_price <= trigger\_price -> EXECUTE

\* STOP\_LOSS: If current\_price <= trigger\_price -> EXECUTE

\* TAKE\_PROFIT: If current\_price >= trigger\_price -> EXECUTE



\---



\## 📊 ER Diagram Logic (Cardinality)



\### Entities (The "Nouns")

\* Users and Stocks are independent core entities.



\### Weak Entities (Dependent Objects)

\* Stock\_Prices\_History: Linked to Stocks via 1:M (One-to-Many).

\* Portfolio\_Snapshots: Linked to Users via 1:M (One-to-Many).



\### Relationships (The "Actions")

\* Transactions: Many-to-Many between Users and Stocks (One user can have many trades; one stock can be in many trades).

\* Portfolios: Many-to-Many tracking ownership state. Links Users(1) to Portfolios(M) and Stocks(1) to Portfolios(M).

\* Pending\_Orders: Many-to-Many representing intended actions. Links Users(1) to Orders(M) and Stocks(1) to Orders(M).

\* Watchlists: Many-to-Many. Links Users(1) to Watchlist(M) and Stocks(1) to Watchlist(M).

