document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Helper: simple escape para texto mostrado en el DOM
  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Helper: obtener inicial para avatar desde el email (parte antes del @)
  function getInitial(email) {
    const local = String(email).split("@")[0] || "";
    const token = local.split(/[._-]/).find(Boolean) || local;
    return token.charAt(0).toUpperCase() || "?";
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities", { cache: "no-store" });
      const activities = await response.json();

      // Clear loading message and reset select to avoid duplicates
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants section (list without bullets, avatars and delete buttons)
        let participantsHtml = "";
        if (details.participants && details.participants.length > 0) {
          participantsHtml =
            `<div class="participants" aria-live="polite"><h5>Participants</h5><ul>` +
            details.participants
              .map((p) => `<li data-activity="${escapeHtml(name)}" data-email="${escapeHtml(p)}"><span class="avatar">${getInitial(p)}</span>${escapeHtml(p)}<button class="delete-btn" aria-label="Unregister ${escapeHtml(p)}">✖</button></li>`)
              .join("") +
            `</ul></div>`;
        } else {
          participantsHtml = `<div class="participants empty">No participants yet</div>`;
        }

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          ${participantsHtml}
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities so the participants list updates immediately
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();

  // Handle participant delete clicks (event delegation)
  activitiesList.addEventListener("click", async (e) => {
    if (e.target && e.target.matches(".delete-btn")) {
      const li = e.target.closest("li");
      if (!li) return;
      const activity = li.dataset.activity;
      const email = li.dataset.email;

      try {
        const resp = await fetch(`/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`, {
          method: "DELETE",
        });
        const resJson = await resp.json();

        if (resp.ok) {
          messageDiv.textContent = resJson.message;
          messageDiv.className = "success";
          messageDiv.classList.remove("hidden");
          // Refresh activities list to reflect change
          await fetchActivities();
        } else {
          messageDiv.textContent = resJson.detail || "An error occurred";
          messageDiv.className = "error";
          messageDiv.classList.remove("hidden");
        }
      } catch (error) {
        messageDiv.textContent = "Failed to unregister. Please try again.";
        messageDiv.className = "error";
        messageDiv.classList.remove("hidden");
        console.error("Error unregistering:", error);
      }

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    }
  });
});
