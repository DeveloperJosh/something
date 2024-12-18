# **HLS Server**

This project is a secure HTTP Live Streaming (HLS) server built with **Node.js** and **Express**, capable of serving HLS video playlists (`.m3u8`), video segments (`.ts`), and subtitles (`.vtt`). It includes features like **signed URLs**, **rate limiting**, and **secure reverse proxy support**.

---

## **Table of Contents**

1. [Features](#features)  
2. [Prerequisites](#prerequisites)  
3. [Installation](#installation)  
4. [Configuration](#configuration)  
5. [Running the Server](#running-the-server)  
6. [Using the Server](#using-the-server)  
7. [Nginx Reverse Proxy Setup](#nginx-reverse-proxy-setup)  
8. [Testing with MPV](#testing-with-mpv)  
9. [Troubleshooting](#troubleshooting)

---

## **Features**

- Serves HLS files (`.m3u8`, `.ts`) and subtitles (`.vtt`) securely.
- Generates signed URLs to prevent unauthorized access.
- Includes a rate limiter to prevent abuse.
- Supports integration with **Nginx** as a reverse proxy.
- Handles dynamic playlist updates with signed segment URLs.

---

## **Prerequisites**

Before you begin, ensure you have the following installed:

1. **Node.js** (v18 or higher)  
2. **NPM** (Node Package Manager)  
3. **Nginx** (for reverse proxy setup)  
4. Basic Linux server knowledge  

---

## **Installation**

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/yourusername/hls-server.git
   cd hls-server
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Set Up Environment Variables**:

   Create a `.env` file in the root directory with the following content:

   ```env
   PORT=3000
   HLS_SECRET=your-very-strong-secret-key
   ```

   - `PORT`: The port your Express server will run on.
   - `HLS_SECRET`: A strong key for signing and verifying URLs.

---

## **Running the Server**

Start the server using the following command:

```bash
node src/index.js
```

The server will start on `http://localhost:3000`.

---

## **Using the Server**

### 1. **Health Check**

Test if the server is running:
```bash
curl http://localhost:3000/health
```
Response:
```
Server is running!
```

### 2. **Generate a Signed URL**

Generate a signed URL for an HLS file:

```bash
curl "http://localhost:3000/generate-url?file=g/master.m3u8&expiresIn=3600"
```

- `file`: The path to the HLS file relative to `/hls/`.
- `expiresIn`: The validity of the URL in seconds.

**Example Response**:
```json
{
  "signedUrl": "http://localhost:3000/hls/g/master.m3u8?expires=1734496325&signature=..."
}
```

### 3. **Access the HLS Stream**

Use the signed URL to access your HLS stream. Example:

```bash
http://localhost:3000/hls/g/master.m3u8?expires=1734496325&signature=...
```

You can also include subtitles (`.vtt`) with players like MPV.

---

## **Nginx Reverse Proxy Setup**

To allow access to the server without specifying the port, set up an **Nginx reverse proxy**.

### Steps:

1. **Edit the Nginx Configuration**:
   ```bash
   sudo nano /etc/nginx/sites-available/hls-server
   ```

2. **Add the Configuration**:
   ```nginx
   server {
       listen 80;
       server_name your_server_ip_or_domain;

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }

       access_log /var/log/nginx/access.log;
       error_log /var/log/nginx/error.log;
   }
   ```

3. **Enable and Reload Nginx**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/hls-server /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

Now you can access the HLS server via:
```
http://your_server_ip_or_domain/hls/g/master.m3u8
```

---

## **Testing with MPV**

To test HLS playback with subtitles using **MPV**:

```bash
mpv "http://your_server_ip_or_domain/hls/g/master.m3u8?expires=1734496325&signature=..."     --sub-file="http://your_server_ip_or_domain/hls/g/english.vtt?expires=1734496361&signature=..."
```

---

## **Troubleshooting**

1. **Server Not Starting**:
   - Ensure Node.js and NPM are installed.
   - Check the `.env` file and verify `HLS_SECRET`.

2. **404 Errors**:
   - Ensure your HLS files are in the `src/hls` directory.
   - Verify Nginx reverse proxy is forwarding requests to the correct port.

3. **Invalid or Expired Signature**:
   - Check the system time on your server.
   - Ensure the generated `expires` timestamp matches the current time.

4. **Nginx Configuration Issues**:
   - Test the Nginx configuration:
     ```bash
     sudo nginx -t
     ```
   - Reload Nginx after changes:
     ```bash
     sudo systemctl reload nginx
     ```

5. **Check Logs**:
   - Express Server Logs:
     ```bash
     node src/index.js
     ```
   - Nginx Logs:
     ```bash
     sudo tail -f /var/log/nginx/error.log
     sudo tail -f /var/log/nginx/access.log
     ```

---

## **Folder Structure**

```
something/
│
├── .git/                     # Git folder
├── node_modules/             # Node.js dependencies
├── src/                      # Source code
│   ├── hls/                  # HLS media files (master.m3u8, segments, etc.)
│   │   └── g/                # Example HLS folder
│   └── index.js              # Main server file
├── .env                      # Environment variables
└── package.json              # NPM package file
```

---

## **Contributing**

Feel free to contribute by submitting pull requests. For major changes, open an issue first to discuss what you would like to change.

---

## **License**

This project is licensed under the MIT License.
