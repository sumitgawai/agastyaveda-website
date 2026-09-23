(async function initializeAuthenticationUi() {
  const guestElements = document.querySelectorAll("[data-auth-guest]");
  const userElements = document.querySelectorAll("[data-auth-user]");
  if (!guestElements.length && !userElements.length) return;

  const setState = (authenticated, user) => {
    guestElements.forEach((element) => { element.hidden = authenticated; });
    userElements.forEach((element) => {
      element.hidden = !authenticated;
      if (authenticated) {
        const name = element.querySelector("[data-auth-name]");
        const email = element.querySelector("[data-auth-email]");
        if (name) name.textContent = user?.name || "My account";
        if (email) email.textContent = user?.email || "";
        const avatar = element.querySelector("[data-auth-avatar]");
        if (avatar && user?.imageUrl) {
          avatar.src = user.imageUrl;
          avatar.hidden = false;
        }
      }
    });
  };

  try {
    const config = await (await fetch("/api/config", { credentials: "include" })).json();
    if (config.clerkEnabled) {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/@clerk/clerk-js@latest/dist/clerk.browser.js";
      script.async = true;
      script.crossOrigin = "anonymous";
      script.setAttribute("data-clerk-publishable-key", config.clerkPublishableKey);
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = () => reject(new Error("Clerk failed to load."));
        document.head.appendChild(script);
      });
      await window.Clerk.load();
    }
    const token = await window.Clerk?.session?.getToken();
    const response = await fetch("/api/session", { credentials: "include", headers: token ? { Authorization: `Bearer ${token}` } : {} });
    const session = await response.json();
    setState(Boolean(session.authenticated), session.user);

    userElements.forEach((element) => {
      const signOut = element.querySelector("[data-auth-sign-out]");
      if (!signOut) return;
      signOut.addEventListener("click", async () => {
        signOut.disabled = true;
        try {
          const logoutResponse = await fetch("/api/auth/sign-out", { method: "POST", credentials: "include" });
          if (!logoutResponse.ok) throw new Error("Sign out failed.");
          if (window.Clerk?.user) await window.Clerk.signOut();
          setState(false);
          window.location.assign("/");
        } catch (error) {
          signOut.disabled = false;
          window.alert(error.message);
        }
      });
    });
  } catch (error) {
    console.error("Unable to determine authentication state:", error);
    setState(false);
  }
})();
