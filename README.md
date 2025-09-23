# Dorf Nelson & Zauderer Confidential Legal Assistant

A professional AI-powered confidential legal assistant built with Next.js 14+ and Azure OpenAI's o4-mini model. This internal application provides comprehensive legal research, document analysis, and template generation for law firm staff.

## Features

- **Modern Chat Interface**: Clean, professional UI with message bubbles and real-time streaming responses
- **Azure OpenAI Integration**: Powered by o4-mini model for intelligent legal assistance
- **Persistent Chat History**: Session-based chat history stored in localStorage
- **Professional Branding**: Dorf Nelson & Zauderer law firm branding with dark blue color scheme
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Real-time Streaming**: Server-sent events for live response streaming
- **Error Handling**: Graceful error handling with user-friendly messages
- **Legal Disclaimers**: Built-in disclaimers to ensure proper legal guidance expectations

## Tech Stack

- **Frontend**: Next.js 14+ with App Router, React 18, TypeScript
- **Styling**: Tailwind CSS with custom law firm branding
- **Backend**: Next.js API routes with streaming support
- **AI Integration**: Azure OpenAI with @azure/openai package
- **Deployment**: Vercel-ready configuration

## Prerequisites

- Node.js 18+ 
- npm or yarn package manager
- Azure OpenAI account with o1-mini model deployed

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd dorf-nelson-zauderer-legal-assistant
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and add your Azure OpenAI credentials:
   ```env
   AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
   AZURE_OPENAI_API_KEY=your-api-key-here
   AZURE_OPENAI_DEPLOYMENT_NAME=o1-mini
   ```

## Azure OpenAI Setup

1. **Create Azure OpenAI Resource**
   - Go to [Azure Portal](https://portal.azure.com/)
   - Create a new Azure OpenAI resource
   - Note down the endpoint URL and API key

2. **Deploy o1-mini Model**
   - In your Azure OpenAI resource, go to "Model deployments"
   - Deploy the o1-mini model
   - Set deployment name as "o1-mini" (or update the environment variable)

3. **Configure Environment Variables**
   - Update your `.env.local` file with the actual values from Azure

## Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Project Structure

```
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts          # Chat API endpoint with streaming
│   ├── globals.css               # Global styles and Tailwind imports
│   ├── layout.tsx                # Root layout component
│   └── page.tsx                  # Main chat page
├── components/
│   ├── ChatWindow.tsx            # Main chat interface component
│   ├── InputBox.tsx              # Message input component
│   └── MessageBubble.tsx         # Individual message display
├── lib/
│   └── openai.ts                 # Azure OpenAI client configuration
├── package.json                  # Dependencies and scripts
├── tailwind.config.ts            # Tailwind CSS configuration
├── tsconfig.json                 # TypeScript configuration
└── next.config.js                # Next.js configuration
```

## Key Components

### ChatWindow
- Main chat interface managing message state
- Handles localStorage persistence
- Manages streaming responses from API
- Includes clear chat functionality

### MessageBubble
- Individual message display component
- Supports user and assistant message styling
- Includes timestamps and avatars

### InputBox
- Message input interface with send functionality
- Auto-expanding textarea
- Keyboard shortcuts (Enter to send, Shift+Enter for new line)
- Legal disclaimer display

### API Route (/api/chat)
- Handles POST requests with message arrays
- Integrates with Azure OpenAI o1-mini model
- Implements Server-Sent Events for streaming responses
- Includes error handling and system prompts

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `AZURE_OPENAI_ENDPOINT` | Your Azure OpenAI resource endpoint | Yes |
| `AZURE_OPENAI_API_KEY` | Your Azure OpenAI API key | Yes |
| `AZURE_OPENAI_DEPLOYMENT_NAME` | Deployment name for o1-mini model | Yes |

## Deployment

### Deploy to Vercel

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository

3. **Configure Environment Variables**
   - In Vercel project settings, add the environment variables:
     - `AZURE_OPENAI_ENDPOINT`
     - `AZURE_OPENAI_API_KEY`
     - `AZURE_OPENAI_DEPLOYMENT_NAME`

4. **Deploy**
   - Vercel will automatically deploy your application
   - Your app will be available at `https://your-app.vercel.app`

### Manual Deployment

For other platforms:

```bash
# Build the application
npm run build

# Start the production server
npm start
```

## Usage

1. **Start a Conversation**
   - Open the application in your browser
   - Type a legal question in the input box
   - Press Enter or click the send button

2. **Chat Features**
   - Messages are automatically saved to localStorage
   - Use "Clear Chat" to reset the conversation
   - Responses stream in real-time for better user experience

3. **Legal Guidance**
   - The AI provides general legal information
   - All responses include appropriate legal disclaimers
   - Users are advised to consult qualified attorneys for personalized advice

## Customization

### Branding
- Update colors in `tailwind.config.ts` (law-blue variables)
- Modify firm name and branding in `ChatWindow.tsx`
- Update system prompt in `lib/openai.ts`

### Styling
- Customize message bubble appearance in `MessageBubble.tsx`
- Modify chat window layout in `ChatWindow.tsx`
- Update global styles in `app/globals.css`

## Troubleshooting

### Common Issues

1. **Azure OpenAI Connection Errors**
   - Verify endpoint URL format (should end with `/`)
   - Check API key validity
   - Ensure o1-mini model is deployed and accessible

2. **Build Errors**
   - Run `npm install` to ensure all dependencies are installed
   - Check TypeScript errors with `npm run lint`
   - Verify environment variables are properly set

3. **Streaming Issues**
   - Ensure your deployment platform supports streaming responses
   - Check network connectivity and firewall settings

### Development Tips

- Use browser developer tools to debug API calls
- Check server logs for Azure OpenAI integration issues
- Test with simple messages first to verify basic functionality

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For technical support or questions about the application, please open an issue in the repository or contact the development team.

---

**Legal Disclaimer**: This application provides general legal information only and does not constitute legal advice. Always consult with a qualified attorney for personalized legal guidance.