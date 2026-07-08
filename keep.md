DATABASE_URL="postgresql://owodefood_admin:YOUR_COPIED_PASSWORD@YOUR_TRUEHOST_IP_OR_LOCALHOST:5432/owodefood_live"
Log in to your Truehost client area and open your cPanel.
Scroll down to the Databases section and click on PostgreSQL Databases (or PostgreSQL Database Wizard).
Create a Database: Enter a name (e.g., owodefood_live) and create it.
Create a User: Scroll down to "Add New User", create a username (e.g., owodefood_admin), and generate a strong password. Copy this password!
Add User to Database: Scroll to "Add User To Database", select the user and database you just created, and assign them All Privileges.
2. Find your HostnameIf you are hosting your Node.js/React app on the same Truehost server as the database, your host will simply be localhost or 127.0.0.1.
If you are hosting your app somewhere else (like Vercel) and the database is on Truehost, you will need the Remote Database IP Address from Truehost. You may also need to go into the "Remote PostgreSQL" section in cPanel and add your app's IP address to allow the connection.
3. Construct your Live Connection String
Using the details you just created in
3. Construct your Live Connection String
Using the details you just created in Truehost, put them together into your live URL:

env
DATABASE_URL="postgresql://owodefood_admin:YOUR_COPIED_PASSWORD@YOUR_TRUEHOST_IP_OR_LOCALHOST:5432/owodefood_live"
4. Set it in your Live Environment
When you deploy your app, go to your live app's Environment Variables settings and paste that DATABASE_URL string.

Once your live app starts, it will securely connect straight to your Truehost database!

npm run db:studio   to check database content

CREATE DATABASE my_new_project;
(Luktayo%40123)


Those are great questions! Here is a simple explanation of both:

### 1. What does `npm run db:push` do?
When you write an app, you define what your database should look like in your code (for example, you tell it "I need a Users table with columns for Email and Password"). 

`` is a command from your database tool (Drizzle) that connects to your empty PostgreSQL database and says, *"Hey, look at the code! Build all the tables and columns exactly how the code describes them."* 

It "pushes" your code's structure into the actual database. Without running this, your PostgreSQL database would remain completely empty, and your app wouldn't have anywhere to save data!

### 2. Why did I replace `@` with `%40`?
In web programming, URLs have strict rules. A database connection URL follows this specific format:
`postgresql://username:password@hostname:port/database`

The system reads the URL from left to right. When it sees the `@` symbol, it thinks: *"Ah, the password is over, whatever comes next must be the hostname!"*

Because your password was `Luktayo@123`, the system saw the first `@` and stopped reading your password early. It thought your password was just `Luktayo`, and it thought the hostname was `123@127.0.0.1`, which caused it to crash and hang.

**`%40`** is the universal internet code (called URL Encoding) fnpm run db:pushor the `@` symbol. By writing `Luktayo%40123`, we are telling PostgreSQL, *"The password contains an @ symbol, but don't split the URL here—just treat it as part of the password text."* 

Did the `db:push` command finish successfully for you after those changes?