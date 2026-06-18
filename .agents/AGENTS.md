# GitHub Token Authentication & Repository Push Rules

When performing Git or GitHub repository operations (such as creating a repository or pushing files) and the user has provided or needs to use a GitHub Personal Access Token (PAT):

1. **GitHub CLI Fallback & Token Scope Check:**
   - If the user is not authenticated through the GitHub CLI (`gh`), do not try to run interactive flows that block.
   - Use the token provided by the user. If they need to create a token, provide this pre-filled scopes link:
     [Create GitHub Personal Access Token (classic)](https://github.com/settings/tokens/new?scopes=repo,read:org,gist&description=Antigravity-Agent-CLI)

2. **Fetching User Identity (API):**
   - Query the GitHub API to fetch the authenticated username using the token:
     `GET https://api.github.com/user` with Header `Authorization: Bearer <token>`.
   - Use this username dynamically instead of asking the user.

3. **Repository Creation (API):**
   - If a repository needs to be created, send a POST request using the token to the GitHub API:
     `POST https://api.github.com/user/repos` with JSON body `{"name": "<repo-name>", "private": false}` (or true, based on requirements).

4. **Secure Git Push Flow:**
   - Add the remote origin using the token embedded in the URL to bypass authentication prompts:
     `git remote add origin https://<token>@github.com/<username>/<repo-name>.git`
     (or `git remote set-url origin ...` if it already exists).
   - Perform the push operation: `git push -u origin main` (or the active branch name).
   - **CRITICAL SECURITY STEP:** Immediately after a successful push, reset the remote origin URL to the standard public URL to ensure the token is never saved in plain text inside the project's local `.git/config` file:
     `git remote set-url origin https://github.com/<username>/<repo-name>.git`
