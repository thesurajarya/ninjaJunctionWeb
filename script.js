// Validate Login Form
function validateLoginForm() {
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value.trim();

  if (!email.includes("@") || !email.includes(".")) {
    alert("Please enter a valid email.");
    return false;
  }

  if (password === "") {
    alert("Please enter your password.");
    return false;
  }

  return true;
}

// Validate Signup Form
function validateSignupForm() {
  const username = document.getElementById("signup-username").value.trim();
  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;
  const confirmPassword = document.getElementById("signup-confirm-password").value;

  if (username === "") {
    alert("Please enter your name.");
    return false;
  }

  if (!email.includes("@") || !email.includes(".")) {
    alert("Please enter a valid email.");
    return false;
  }

  if (password.length < 6) {
    alert("Password must be at least 6 characters.");
    return false;
  }

  if (password !== confirmPassword) {
    alert("Passwords do not match.");
    return false;
  }

  return true;
}

// Attach to form submit
document.getElementById("login-form").onsubmit = validateLoginForm;
document.getElementById("signup-form").onsubmit = validateSignupForm;

//dynamically updating navbar after successful login
auth.onAuthStateChanged((user) => {
  const navbar = document.getElementById("navbar");
  if (user) {
    // User is logged in
    navbar.innerHTML = `
      <a href="index.html">Home</a>
      <a href="profile.html">Dashboard</a>
      <a href="index.html" onclick="logout()">Logout</a>
    `;
  } else {
    // Not logged in
    // navbar.innerHTML = `
    //   <a href="index.html">Home</a>
    //   <a href="index.html#">Login</a>
    //   <a href="signup.html">Sign Up</a>
    // `;
  }
});

function logout() {
  auth.signOut().then(() => {
    alert("Logged out successfully!");
    window.location.href = "index.html";
  });
}
