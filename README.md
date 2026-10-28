# Portfolio Website

A classic personal portfolio that loads projects **live from GitHub**. New public repos appear automatically, with no rebuild.

- Plain HTML/CSS/JS plus one Vercel serverless function (`api/github.js`). No build step, no dependencies.
- Sections: **About**, **Projects** (the repos you pick in `config.js`, with live details from GitHub) and **Contact**.
- Three colour themes (dark, white, indigo) that visitors can switch between.
- If one data source fails it falls back to the next: Vercel function (CDN-cached for 1 h) → direct GitHub API → the visitor's last cached copy.

## Run locally

Requires Node 18+.

```bash
npm run dev     # http://localhost:3000
npm test        # logic tests + live GitHub check
```

## Deploy to Vercel

1. Push this folder to a new GitHub repo (for example `portfolio-website`):
   ```bash
   git init && git add . && git commit -m "Portfolio website"
   git branch -M main
   git remote add origin https://github.com/JamshidbekYusupov/portfolio-website.git
   git push -u origin main
   ```
2. On [vercel.com](https://vercel.com), go to **Add New → Project** and import that repo.
   Framework preset: **Other**. Leave the build command and output directory empty. Click **Deploy**.
3. *(Optional, recommended)* Under **Settings → Environment Variables**, add `GITHUB_TOKEN`: a GitHub
   fine-grained token with *public repositories read-only* access. This raises the GitHub API limit
   from 60 to 5,000 requests/hour. Redeploy after adding it.

## Updating projects

| You want to… | Do this |
|---|---|
| Add or remove a project | Edit the `projects` list in `config.js` (the order there is the order on the page), then push. If you empty the list (`projects: []`), every public repo is shown automatically, newest first, including new ones (within about an hour, because of the CDN cache). |
| Give it a better title or description | Add an entry under `overrides` in `config.js` (`title`, `description`, `tags`, `demo`, `image`). Or set the description, topics and website on GitHub itself; the site uses those automatically. |
| Hide a repo | Add its name to `hidden` in `config.js`. |
| Edit your bio, skills, email, phone or LinkedIn | Edit the top of `config.js`. |
| Update your CV | Replace `files/Yusupov_Jamshidbek_CV_Data_Science.pdf` with the new PDF (same name), or put a new file in `files/` and change `cv` in `config.js`. |
| Change your photo | Put the image in `images/` (e.g. `images/me.jpg`) and set `photo: "images/me.jpg"` in `config.js`. Leave it empty to use your GitHub picture. |
| Change the starting colour theme | Set `defaultTheme` to `"dark"`, `"white"` or `"indigo"`. Visitors can also switch themes with the dots in the header. |

Every `git push` to `main` redeploys automatically on Vercel.
