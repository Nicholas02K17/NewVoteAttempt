// Function to send a vote with a 24-hour timeout
function vote(number) {
    const lastVoteTime = localStorage.getItem("lastVoteTime");
    const currentTime = Date.now();

    if (lastVoteTime && currentTime - lastVoteTime < 24 * 60 * 60 * 1000) {
        const remainingTime = Math.ceil((24 * 60 * 60 * 1000 - (currentTime - lastVoteTime)) / (60 * 60 * 1000));
        alert(`You have already voted! Please wait ${remainingTime} hours before voting again.`);
        return;
    }

    fetch("/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number }),
    })
    .then(response => response.json())
    .then(data => {
        alert("Vote recorded!");
        localStorage.setItem("lastVoteTime", Date.now()); // Store vote time
    })
    .catch(error => console.error("Error:", error));
}

// Function to fetch and display results
function fetchResults() {
    fetch("/results")
    .then(response => response.json())
    .then(data => {
        for (let num = 1; num <= 5; num++) {
            document.getElementById(`vote-${num}`).innerText = data[num] || 0;
        }
    })
    .catch(error => console.error("Error:", error));
}

// Function to reset all votes
function resetVotes() {
    fetch("/reset", { method: "POST" })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert("All votes have been reset!");
            fetchResults(); // ✅ Update results after reset
        } else {
            alert("Reset failed. Try again.");
        }
    })
    .catch(error => console.error("Error:", error));
}

// Auto-fetch results when on the results page
if (window.location.pathname.includes("results.html")) {
    fetchResults();
}