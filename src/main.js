import "./style.css";
import javascriptLogo from "./javascript.svg";
import viteLogo from "/vite.svg";
import { setupCounter } from "./counter.js";

const clientId = "38503672f41447e586f3f1988d30611a";
const params = new URLSearchParams(window.location.search);
const code = params.get("code");
let expireIn;


let timestamp = Date.parse(localStorage.getItem("tokkenStart"));
let newDate = new Date(timestamp);


if (localStorage.getItem("access_token") && newDate > new Date()) {

  
  if (localStorage.getItem("tokenRefreshed") != "true") {
   console.log("delete")
    const accessToken = await getAccessToken(clientId, code);
    const profile = await fetchProfile(accessToken);
    localStorage.setItem("tokenRefreshed", true);
  }

  const token = fetchProfile(localStorage.getItem("access_token"))
    .then((profile) => {
      populateUI(profile);
    })
    .catch((error) => {
      console.error("error fetching profile");
    });

  const artists = getArtists(localStorage.getItem("access_token"))
    .then((artists) => {
      populateFollowedArtists(artists.artists.items);
    })
    .catch((error) => {
      console.error("error fetching following artists");
    });
} else if (!code) {
  redirectToAuthCodeFlow(clientId);
} else if (newDate < new Date()) {
  const accessToken = await getRefreshToken(clientId);
  const profile = await fetchProfile(accessToken);
}else{
  const accessToken = await getAccessToken(clientId);
  const profile = await fetchProfile(accessToken); 
}

// TODO: Redirect to Spotify authorization page
export async function redirectToAuthCodeFlow(clientId) {
  const verifier = generateCodeVerifier(128);
  const challenge = await generateCodeChallenge(verifier);

  localStorage.setItem("verifier", verifier);
  expireIn = new Date();
  expireIn.setSeconds(expireIn.getSeconds() + 10);
  localStorage.setItem("tokkenStart", expireIn);

  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("response_type", "code");
  params.append("redirect_uri", "http://localhost:5173/callback");
  params.append(
    "scope",
    "user-read-private, user-read-email, user-follow-read"
  );
  params.append("code_challenge_method", "S256");
  params.append("code_challenge", challenge);

  document.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
 
}

function generateCodeVerifier(length) {
  let text = "";
  let possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

async function generateCodeChallenge(codeVerifier) {
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function getRefreshToken(clientId) {
  // refresh token that has been previously stored
  const refreshToken = localStorage.getItem("refresh_token");
  const url = "https://accounts.spotify.com/api/token";

  const payload = {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
    }),
  };

  const body = await fetch(url, payload);
  const response = await body.json();
console.log(response)
  localStorage.setItem("access_token", response.access_token);
  if (response.refreshToken) {
    localStorage.setItem("refresh_token", response.refresh_token);
  }
  console.log(localStorage.getItem("access_token"))
  expireIn = new Date();
  expireIn.setSeconds(expireIn.getSeconds() + 10);
  localStorage.setItem("tokkenStart", expireIn);
}

async function getAccessToken(clientId, code) {
  const verifier = localStorage.getItem("verifier");

  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("grant_type", "authorization_code");
  params.append("code", code);
  params.append("redirect_uri", "http://localhost:5173/callback");
  params.append("scope", "user-read-private, user-read-email");
  params.append("code_verifier", verifier);

  const result = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  const { access_token, refresh_token } = await result.json();
  localStorage.setItem("access_token", access_token);
  localStorage.setItem("refresh_token", refresh_token);

  return access_token;
}

async function fetchProfile(token) {
  console.log(await fetch("https://api.spotify.com/v1/me", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  }))
  const result = await fetch("https://api.spotify.com/v1/me", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  return await result.json();
}

// get followed artists
async function getArtists(token) {
  const result = await fetch(
    "https://api.spotify.com/v1/me/following?type=artist",
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  return await result.json();
}

document.getElementById("submit").onclick = function (e) {
  event.preventDefault(e);

  research(
    localStorage.getItem("access_token"),
    encodeURIComponent(document.getElementById("item").value)
  )
    .then((data) => {
      populateSearchData(data.tracks.items);
    })
    .catch((error) => {
      console.error("error fetching search");
    });
};

// research
async function research(token, item) {
  const result = await fetch(
    `https://api.spotify.com/v1/search?q=${item}&type=track`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  return await result.json();
}

function populateUI(profile) {
  document.getElementById("displayName").innerText = profile.display_name;
  if (profile.images[0]) {
    const profileImage = new Image(200, 200);
    profileImage.src = profile.images[0].url;
    document.getElementById("avatar").appendChild(profileImage);
    document.getElementById("imgUrl").innerText = profile.images[0].url;
  }
  document.getElementById("id").innerText = profile.id;
  document.getElementById("email").innerText = profile.email;
  document.getElementById("uri").innerText = profile.uri;
  document
    .getElementById("uri")
    .setAttribute("href", profile.external_urls.spotify);
  document.getElementById("url").innerText = profile.href;
  document.getElementById("url").setAttribute("href", profile.href);
}

function populateFollowedArtists(artists) {
  for (let i = 0; i < artists.length; i++) {
    document.querySelector("#followedArtists").innerHTML = `
  <div class="card" style="width: 18rem;">
  <img src="..." class="card-img-top" alt="..." id="artistImage">
  <div class="card-body">
    <h5 class="card-title" id="artistName">Card title</h5>
    
    <a href="#" class="btn btn-primary" id="openUrl">Lien vers l'artiste</a>
  </div>
</div>
     `;
    document.getElementById("artistImage").src = artists[i].images[0].url;
    document.getElementById("artistName").innerText = artists[i].name;
    document.getElementById("openUrl").href = artists[i].external_urls.spotify;
  }
}

function populateSearchData(data) {
  for (let i = 0; i < data.length; i++) {
    document.querySelector("#data").innerHTML += `
  <div class="card" style="width: 18rem;">
  <img src="..." class="card-img-top" alt="..." id="itemImage${i}">
  <div class="card-body">
    <h5 class="card-title" id="itemName${i}">Card title</h5>
    <a href="#" class="btn btn-primary" id="itemOpenUrl${i}">Lien vers l'artiste</a>
    <iframe src="${data[i].external_urls.spotify}" width="600" height="400"></iframe>
  </div>
</div>
     `;
    document.getElementById("itemImage" + i).src = data[i].album.images[0].url;
    document.getElementById("itemName" + i).innerText = data[i].name;
    document.getElementById("itemOpenUrl" + i).href =
      data[i].external_urls.spotify;
  }
}

document.querySelector("#app").innerHTML = `
<section id="profile">
<h2>Logged in as <span id="displayName"></span></h2>
<span id="avatar"></span>
<ul class="list-unstyled">
    <li>User ID: <span id="id"></span></li>
    <li>Email: <span id="email"></span></li>
    <li>Spotify URI: <a id="uri" href="#"></a></li>
    <li>Link: <a id="url" href="#"></a></li>
    <li>Profile Image: <span id="imgUrl"></span></li>
</ul>
</section>
 `;
