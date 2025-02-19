# AWS WAF ACL Visualization Tool

## Overview
This project is a **React-based visualization tool** for AWS WAF ACLs. It retrieves Web ACL data from an **Express backend** and presents it in an interactive **flowchart** using `reactflow` and `dagre` for auto-layout.

## Features
- Fetches **Web ACLs and rule groups** from AWS WAF.
- Supports **custom and managed rule groups**.
- Visualizes ACLs, rules, and rule groups using **React Flow**.
- Uses `dagre` for **automatic graph layout**.
- Interactive UI with **collapsible nodes**.

## Tech Stack
### **Frontend**
- React
- React Flow (for visualization)
- Material UI (for UI components)
- Dagre (for auto-layout graphs)

### **Backend**
- Node.js
- Express
- AWS SDK for WAF V2
- CORS & dotenv

## Installation & Setup
### **1. Clone the repository**
```sh
git clone <repo_url>
cd <project_directory>
```

### **2. Install dependencies**
```sh
npm install
```

### **3. Set up environment variables**
Create a `.env` file in the root directory with the required AWS credentials:
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
```

### **4. Start the backend**
```sh
npm run server
```

### **5. Start the frontend**
```sh
npm start
```

## API Endpoints
| Method | Endpoint | Description |
|--------|----------|--------------|
| GET | `/api/waf-acls` | Fetches Web ACLs and rule group details |

## Usage
1. Open the web app in your browser.
2. View AWS WAF ACL rules in an interactive tree/flowchart.
3. Click on nodes to expand rule details.

## Contribution
Feel free to open an issue or submit a pull request if you have any improvements or bug fixes!

## License
This project is licensed under the MIT License.

