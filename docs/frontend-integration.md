# Frontend Integration Checklist

This checklist helps frontend developers integrate with the Gmail Email Client backend.

## ✅ Prerequisites

- [ ] Backend is running locally or deployed
- [ ] You have access to the `.env` file or know the API base URL
- [ ] Swagger docs are accessible at `/docs`
- [ ] Google Cloud project is set up (see backend Setup Guide)

## 🔐 Authentication Flow

### Step 1: Implement Gmail OAuth Flow

```typescript
// 1. Get the OAuth URL from backend
const getGmailAuthUrl = async () => {
  const response = await fetch(`${API_BASE_URL}/auth/google/gmail-url`);
  const { url } = await response.json();
  return url;
};

// 2. Open OAuth in popup or redirect
const initiateGmailAuth = async () => {
  const authUrl = await getGmailAuthUrl();
  
  // Option A: Redirect (simpler)
  window.location.href = authUrl;
  
  // Option B: Popup (better UX)
  const popup = window.open(authUrl, 'Gmail Auth', 'width=500,height=600');
  // Listen for callback...
};

// 3. Handle callback (extract code from URL)
const handleOAuthCallback = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  
  if (code) {
    exchangeCodeForTokens(code);
  }
};

// 4. Exchange code for app tokens
const exchangeCodeForTokens = async (code: string) => {
  const response = await fetch(`${API_BASE_URL}/auth/google/gmail-callback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  });
  
  const { user, accessToken, refreshToken } = await response.json();
  
  // Store tokens
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
  localStorage.setItem('user', JSON.stringify(user));
  
  // Redirect to inbox
  navigate('/inbox');
};
```

### Step 2: Implement Token Storage

- [ ] Store access token in memory or localStorage (15 min expiry)
- [ ] Store refresh token in localStorage or httpOnly cookie
- [ ] Store user info for display
- [ ] Clear tokens on logout

```typescript
// Token management utility
class TokenManager {
  private static accessToken: string | null = null;
  
  static setTokens(access: string, refresh: string) {
    this.accessToken = access; // In memory
    localStorage.setItem('refreshToken', refresh);
  }
  
  static getAccessToken(): string | null {
    return this.accessToken || localStorage.getItem('accessToken');
  }
  
  static getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }
  
  static clearTokens() {
    this.accessToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }
}
```

### Step 3: Implement Auto-Refresh

- [ ] Intercept 401 responses
- [ ] Call refresh endpoint
- [ ] Retry original request
- [ ] Logout if refresh fails

```typescript
// API client with auto-refresh
const apiClient = async (url: string, options: RequestInit = {}) => {
  const accessToken = TokenManager.getAccessToken();
  
  // Add auth header
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${accessToken}`
  };
  
  let response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers
  });
  
  // Handle 401 - token expired
  if (response.status === 401) {
    const refreshToken = TokenManager.getRefreshToken();
    
    if (!refreshToken) {
      // No refresh token, logout
      TokenManager.clearTokens();
      navigate('/login');
      throw new Error('Authentication required');
    }
    
    // Try to refresh
    const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    
    if (refreshResponse.ok) {
      const { accessToken: newAccessToken, refreshToken: newRefreshToken } = 
        await refreshResponse.json();
      
      TokenManager.setTokens(newAccessToken, newRefreshToken);
      
      // Retry original request with new token
      response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${newAccessToken}`
        }
      });
    } else {
      // Refresh failed, logout
      TokenManager.clearTokens();
      navigate('/login');
      throw new Error('Session expired');
    }
  }
  
  return response;
};
```

## 📧 Email Operations

### Fetch Mailboxes

- [ ] Fetch on app load after authentication
- [ ] Display in sidebar with unread counts
- [ ] Refresh periodically or on user action

```typescript
const fetchMailboxes = async () => {
  const response = await apiClient('/emails/mailboxes');
  const mailboxes = await response.json();
  return mailboxes;
};

// Example response:
// [
//   { id: "INBOX", name: "INBOX", messagesTotal: 150, messagesUnread: 23 },
//   { id: "SENT", name: "SENT", messagesTotal: 89, messagesUnread: 0 },
//   ...
// ]
```

### Fetch Email List

- [ ] Implement pagination
- [ ] Support folder filtering
- [ ] Add search functionality
- [ ] Show loading states

```typescript
const fetchEmails = async (
  folder = 'INBOX',
  page = 1,
  limit = 20,
  search = ''
) => {
  const params = new URLSearchParams({
    folder,
    page: page.toString(),
    limit: limit.toString(),
    ...(search && { search })
  });
  
  const response = await apiClient(`/emails/list?${params}`);
  const { emails, pagination } = await response.json();
  
  return { emails, pagination };
};

// Usage:
const { emails, pagination } = await fetchEmails('INBOX', 1, 20);
```

### Fetch Email Detail

- [ ] Fetch when user clicks on email
- [ ] Display HTML body (sanitize!)
- [ ] Show attachments
- [ ] Mark as read

```typescript
const fetchEmail = async (emailId: string) => {
  const response = await apiClient(`/emails/${emailId}`);
  const email = await response.json();
  return email;
};

// Important: Sanitize HTML before rendering!
import DOMPurify from 'dompurify';

const EmailBody = ({ htmlBody }: { htmlBody: string }) => {
  const sanitizedHtml = DOMPurify.sanitize(htmlBody);
  return <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
};
```

### Send Email

- [ ] Create compose form
- [ ] Validate recipients
- [ ] Support CC/BCC
- [ ] Show success/error feedback

```typescript
const sendEmail = async (
  to: string[],
  subject: string,
  body: string,
  cc?: string[],
  bcc?: string[]
) => {
  const response = await apiClient('/emails/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, subject, body, cc, bcc })
  });
  
  return await response.json();
};

// Usage:
await sendEmail(
  ['recipient@example.com'],
  'Hello',
  '<p>Email content</p>'
);
```

### Reply to Email

- [ ] Pre-fill recipient from original email
- [ ] Quote original message
- [ ] Support reply-all
- [ ] Link to thread

```typescript
const replyToEmail = async (
  emailId: string,
  body: string,
  replyAll = false,
  cc?: string[]
) => {
  const response = await apiClient(`/emails/${emailId}/reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body, replyAll, cc })
  });
  
  return await response.json();
};
```

### Modify Email

- [ ] Implement mark as read/unread
- [ ] Add star/unstar functionality
- [ ] Support moving to trash
- [ ] Update UI optimistically

```typescript
const modifyEmail = async (
  emailId: string,
  modifications: {
    read?: boolean;
    starred?: boolean;
    trash?: boolean;
    addLabels?: string[];
    removeLabels?: string[];
  }
) => {
  const response = await apiClient(`/emails/${emailId}/modify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(modifications)
  });
  
  return await response.json();
};

// Examples:
await modifyEmail(emailId, { read: true });
await modifyEmail(emailId, { starred: true });
await modifyEmail(emailId, { trash: true });
```

### Download Attachment

- [ ] Trigger download on click
- [ ] Show file name and size
- [ ] Handle large files

```typescript
const downloadAttachment = async (
  messageId: string,
  attachmentId: string,
  filename: string
) => {
  const response = await apiClient(
    `/emails/${messageId}/attachments/${attachmentId}`
  );
  
  const blob = await response.blob();
  
  // Trigger download
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};
```

## 🎨 UI Components Checklist

### Email List
- [ ] Virtual scrolling for performance
- [ ] Unread indicator
- [ ] Star button
- [ ] Attachment indicator
- [ ] Snippet preview
- [ ] Sender name/email
- [ ] Date formatting (relative or absolute)
- [ ] Select checkbox
- [ ] Loading skeleton

### Email Detail
- [ ] Header (from, to, subject, date)
- [ ] Body (HTML with sanitization)
- [ ] Attachments list
- [ ] Action buttons (reply, forward, delete, star)
- [ ] Back to list button
- [ ] Loading state

### Compose/Reply Modal
- [ ] To/CC/BCC fields
- [ ] Subject field
- [ ] Rich text editor
- [ ] Send button
- [ ] Cancel button
- [ ] Draft saving (optional)
- [ ] Attachment upload (optional)

### Mailbox Sidebar
- [ ] List of folders/labels
- [ ] Unread counts
- [ ] Active folder highlight
- [ ] Compose button
- [ ] User profile section
- [ ] Logout button

## 🔄 State Management

### Recommended State Structure

```typescript
interface AppState {
  auth: {
    user: User | null;
    isAuthenticated: boolean;
    loading: boolean;
  };
  emails: {
    list: Email[];
    current: Email | null;
    loading: boolean;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  mailboxes: {
    list: Mailbox[];
    current: string; // current folder ID
  };
  ui: {
    composeOpen: boolean;
    selectedEmailIds: string[];
  };
}
```

## ⚡ Performance Optimization

- [ ] Implement virtual scrolling for email list
- [ ] Cache mailbox data
- [ ] Debounce search input
- [ ] Optimistic UI updates
- [ ] Lazy load email bodies
- [ ] Paginate email list
- [ ] Implement loading states
- [ ] Error boundaries

## 🧪 Testing Checklist

- [ ] Test Gmail OAuth flow
- [ ] Test token refresh on expiry
- [ ] Test logout clears tokens
- [ ] Test email list pagination
- [ ] Test search functionality
- [ ] Test send email
- [ ] Test reply functionality
- [ ] Test mark as read/unread
- [ ] Test star/unstar
- [ ] Test attachment download
- [ ] Test error handling
- [ ] Test offline behavior

## 🐛 Common Issues & Solutions

### Issue: "Invalid credentials" on every request
**Solution**: Check that you're including the `Authorization: Bearer {token}` header

### Issue: Token refresh loop
**Solution**: Make sure you're not calling refresh on 401 from the refresh endpoint itself

### Issue: CORS errors
**Solution**: Verify backend CORS_ORIGIN includes your frontend URL

### Issue: HTML email rendering issues
**Solution**: Always sanitize HTML with DOMPurify before rendering

### Issue: Large email list performance
**Solution**: Implement virtual scrolling (react-window or react-virtualized)

## 📱 Responsive Design Checklist

- [ ] Mobile: Single column layout
- [ ] Tablet: Two column (list + detail)
- [ ] Desktop: Three column (mailboxes + list + detail)
- [ ] Touch-friendly tap targets (44px minimum)
- [ ] Swipe gestures for mobile (optional)
- [ ] Hamburger menu for mobile sidebar

## ♿ Accessibility Checklist

- [ ] Keyboard navigation support
- [ ] ARIA labels for buttons
- [ ] Focus indicators
- [ ] Screen reader announcements
- [ ] Skip links
- [ ] Semantic HTML
- [ ] Color contrast compliance

## 🚀 Deployment

- [ ] Set API_BASE_URL to production backend
- [ ] Configure Google OAuth redirect URI for production
- [ ] Enable HTTPS
- [ ] Add error tracking (Sentry, etc.)
- [ ] Add analytics (optional)
- [ ] Test on production environment

## 📝 Environment Variables

```env
# Frontend .env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_APP_NAME=Gmail Email Client
```

## 🔗 Useful Resources

- [Backend Setup Guide](../docs/setup-guide.md)
- [Backend API Reference](../docs/api-reference.md)
- [Swagger Docs](http://localhost:3000/docs)
- [React Email Template](https://react.email/)
- [DOMPurify](https://github.com/cure53/DOMPurify)
- [React Window](https://github.com/bvaughn/react-window)

---

## ✨ Quick Start Template

```typescript
// src/api/client.ts
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function apiCall(endpoint: string, options?: RequestInit) {
  const accessToken = localStorage.getItem('accessToken');
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
      ...options?.headers,
    },
  });
  
  if (response.status === 401) {
    // Handle token refresh...
  }
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'API call failed');
  }
  
  return response.json();
}

// src/api/emails.ts
export const emailsAPI = {
  getMailboxes: () => apiCall('/emails/mailboxes'),
  getEmails: (folder = 'INBOX', page = 1) => 
    apiCall(`/emails/list?folder=${folder}&page=${page}`),
  getEmail: (id: string) => apiCall(`/emails/${id}`),
  sendEmail: (data: SendEmailDto) => 
    apiCall('/emails/send', { method: 'POST', body: JSON.stringify(data) }),
  // ... more methods
};
```
