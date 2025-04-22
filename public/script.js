document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('placementTestForm');
    const resultsDiv = document.getElementById('results');
    const resultsContent = document.getElementById('results-content');
    const submitButton = document.getElementById('submitButton');
    const statusMessage = document.getElementById('submissionStatus');
    const skipButtons = form.querySelectorAll('.skip-button');

    // Keep track of skipped questions
    const skippedQuestions = new Set();

    // --- Define Correct Answers (Ensure this is complete and accurate) ---
    const correctAnswers = {
         q1: 'b', q2: 'a', q3: 'b', q4: 'c', q5: 'd', q6: 'c', q7: 'a', q8: 'd', q9: 'a', q10: 'd',
         q11: 'a', q12: 'c', q13: 'b', q14: 'c', q15: 'c', q16: 'a', q17: 'c', q18: 'a', q19: 'b', q20: 'b',
         q21: 'a', q22: 'c', q23: 'a', q24: 'a', q25: 'b', q26: 'd', q27: 'b', q28: 'b', q29: 'a', q30: 'b',
         q31: 'a', q31b: 'a', q32: 'a', q33: 'c', q34: 'a', // Handled q31b
         q35: 'a', q36: 'a', q37: 'a', q38: 'd', q39: 'c', q40: 'c', q41: 'a', q42: 'c', q43: 'c', q44: 'a',
         q45: 'd', q46: 'c', q47: 'a', q48: 'a', q49: 'b', q50: 'd', q51: 'd', q52: 'b', q53: 'd', q54: 'c',
         q55: 'd', q56: 'b', q57: 'd', q58: 'b', q59: 'c', q60: 'b', q61: 'a', q62: 'a', q63: 'a', q64: 'a',
         q65: 'b', q66: 'd', q67: 'b', q68: 'c', q69: 'a', q70: 'd', q71: 'a', q72: 'b', q73: 'a', q74: 'b',
         q75: 'a', q76: 'd', q77: 'b', q78: 'a', q79: 'b', q80: 'a', q81: 'b', q82: 'b', q83: 'a', q84: 'a',
         q85: 'c', q86: 'a', q87: 'c', q88: 'a', q89: 'a', q90: 'b'
    };
    // Define the total number of actual test questions
    const totalQuestions = Object.keys(correctAnswers).length;

    // --- Event Listener for Skip Buttons ---
    skipButtons.forEach(button => {
        button.addEventListener('click', () => {
            const questionName = button.dataset.questionName;
            const questionBlock = button.closest('.question-block');
            const radioInputs = form.querySelectorAll(`input[type="radio"][name="${questionName}"]`);

            radioInputs.forEach(radio => radio.checked = false);
            skippedQuestions.add(questionName);
            questionBlock.classList.add('skipped');
             console.log(`Skipped: ${questionName}`);
        });
    });

     // --- Event Listener for Answering (to remove skipped state) ---
    form.querySelectorAll('input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const questionName = radio.name;
             const questionBlock = radio.closest('.question-block');
            if (skippedQuestions.has(questionName)) {
                skippedQuestions.delete(questionName);
                questionBlock.classList.remove('skipped');
                console.log(`Un-skipped: ${questionName}`);
            }
        });
    });

    // --- Form Submission Logic ---
    form.addEventListener('submit', async function(event) {
        event.preventDefault();
        submitButton.disabled = true;
        setStatus('Calculating results and submitting...', 'pending');

        const formData = new FormData(form);
        const userAnswers = {};
        let score = 0;
        let answeredCount = 0;
        let skippedCount = 0;
        let correctCount = 0;   // <-- Initialize correct counter
        let incorrectCount = 0; // <-- Initialize incorrect counter
        let resultsHTML = '<ul>';

        // Iterate through defined correct answers to ensure we process all questions
        for (const qName of Object.keys(correctAnswers)) {
             const questionNum = qName.replace('q', '');
             const correctAnswer = correctAnswers[qName];
             let userAnswer = formData.get(qName);
             let resultClass = '';
             let resultText = '';

             if (skippedQuestions.has(qName)) {
                 userAnswer = "SKIPPED";
                 skippedCount++;
                 resultClass = 'skipped';
                 resultText = `<strong>Question ${questionNum}:</strong> Skipped.`;
             } else if (userAnswer) {
                 answeredCount++;
                 const isCorrect = userAnswer === correctAnswer;
                 if (isCorrect) {
                     score++;
                     correctCount++; // <-- Increment correct count
                     resultClass = 'correct';
                     resultText = `<strong>Question ${questionNum}:</strong> Your answer: ${userAnswer}. ✔️`;
                 } else {
                     incorrectCount++; // <-- Increment incorrect count
                     resultClass = 'incorrect';
                     resultText = `<strong>Question ${questionNum}:</strong> Your answer: ${userAnswer}. (Correct: ${correctAnswer}) ❌`;
                 }
             } else {
                 userAnswer = null;
                 resultClass = 'unanswered';
                 resultText = `<strong>Question ${questionNum}:</strong> Not Answered.`;
             }

            userAnswers[qName] = userAnswer;
            resultsHTML += `<li class="${resultClass}">${resultText}</li>`;
        }


        resultsHTML += '</ul>';
        // Add the summary section
        resultsHTML += `<h3>Summary</h3>`;
        resultsHTML += `<p><strong>Final Score: ${score} / ${totalQuestions}</strong></p>`;
        resultsHTML += `<p>Correct Answers: ${correctCount}</p>`;     // <-- Display correct count
        resultsHTML += `<p>Incorrect Answers: ${incorrectCount}</p>`; // <-- Display incorrect count
        resultsHTML += `<p>Skipped: ${skippedCount}</p>`;
        resultsHTML += `<p>Unanswered: ${totalQuestions - answeredCount - skippedCount}</p>`;


        // Display results immediately
        resultsContent.innerHTML = resultsHTML;
        resultsDiv.style.display = 'block';
        resultsDiv.scrollIntoView({ behavior: 'smooth' });

        // Prepare data for backend (no changes needed here for this display feature)
        const submissionData = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            score: score, // Score is already correctCount
            totalQuestions: totalQuestions,
            timestamp: new Date().toISOString(),
            answers: userAnswers
        };

        // Send data to backend
        try {
            setStatus('Saving results...', 'pending');
            const response = await fetch('/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(submissionData),
            });

            if (response.ok) {
                setStatus('Results submitted successfully!', 'success');
            } else {
                const errorData = await response.text();
                setStatus(`Error submitting results: ${errorData}`, 'error');
                submitButton.disabled = false;
            }
        } catch (error) {
            console.error('Submission Error:', error);
            setStatus('Network error. Could not submit results.', 'error');
            submitButton.disabled = false;
        }
    });

    function setStatus(message, type) {
        statusMessage.textContent = message;
        statusMessage.className = `status-message status-${type}`;
    }
});