# GrabStack — Quick Reference

## Every time you start working
```
git pull
```
Then start the app:
```
cd C:\Users\raj\Desktop\grabstack
npx expo start
```
Scan the QR code with Expo Go on your Samsung.

---

## Every time you finish working
```
git add .
git commit -m "what you changed today"
git push
```

---

## Setting up a new computer (work PC — one time only)
1. Install Node.js → nodejs.org (LTS version)
2. Install Git → git-scm.com (all defaults)
3. Open Command Prompt and run:
```
cd C:\Users\yourname\Desktop
git clone https://github.com/rajbajajpr/grabstack.git
cd grabstack
npm install --legacy-peer-deps
```
4. Configure Git identity (first time only):
```
git config --global user.email "pelletter@gmail.com"
git config --global user.name "Raj"
```
5. Start the app:
```
npx expo start
```

---

## If Expo asks for a port, say yes to 8082
## If Git asks for a password, use your GitHub Personal Access Token (not your GitHub password)

---

## Useful commands
| What                        | Command                              |
|-----------------------------|--------------------------------------|
| Start the app               | `npx expo start`                     |
| See what's changed          | `git status`                         |
| See recent commits          | `git log --oneline`                  |
| Undo unsaved changes        | `git checkout .`                     |
| Install missing packages    | `npm install --legacy-peer-deps`     |

---

## Project locations
- Code on your laptop:  `C:\Users\raj\Desktop\grabstack`
- Code on GitHub:       `https://github.com/rajbajajpr/grabstack`
- Web prototype:        Your Netlify URL (for sharing with others, no setup needed)

---

## The golden rule
**Pull before you start. Push when you're done.**
