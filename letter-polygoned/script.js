"use strict";

const red_accented = "#D9534F";
const black_accented = "#292b2c";
const white_accented = "#f8f9fa";

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const activeWordDiv = document.getElementById('active-word');

canvas.width = 600;
canvas.height = 600;

let getRand = Math.random;
let playingTodays = false;

let genWordList = [];
let wordList = [];
let letterPoints = [];

let state = {
	n: 3,
	m: 1,
	activeWord: "",
	words: [],
	activeWordPoints: [],
	wordsPoints: [],
	recentPoint: null,
	letters: [],
	wordAttempts: [],
	stateTag: null,
	solved: false,
	dateStr: null,
}

let allStates = {};

// Function to draw the N-gon with labels
function render() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	// html stuff --------------------------------
	// Game states
	const gameStatesDiv = document.getElementById('game-states');
	let gameStatesHTML = "";
	for (let key in allStates) {
		const solved = allStates[key].solved;
		if (solved) {
			gameStatesHTML += `<span class="tag" onclick="loadGameState('${key}')">${key}</span>`;
		} else {
			gameStatesHTML += `<span class="tag" onclick="loadGameState('${key}')">${key}</span>`;
		}
	}
	gameStatesDiv.innerHTML = gameStatesHTML;

	if (!state) {
		return;
	}

	const usedLetters = new Set();
	let activeWordDivHTML = "";

	for (let word of state.words) {
		for (let letter of word) {
			if (usedLetters.has(letter)) {
				activeWordDivHTML += `<span style="opacity: 0.5;">${letter}</span>`;
			} else {
				activeWordDivHTML += letter;
			}
			usedLetters.add(letter);
		}
		activeWordDivHTML += "-";
	}

	if (check_game_over()) {
		activeWordDivHTML = activeWordDivHTML.slice(0, -1);
	} else {
		activeWordDivHTML += `[${state.activeWord}]`;
	}
	activeWordDiv.innerHTML = activeWordDivHTML;

	// Word attempts
	const wordAttemptsDiv = document.getElementById('word-attempts');
	let wordAttemptsHTML = "";
	let wanted_letter = null;
	if (state.activeWord.length !== 0) {
		wanted_letter = state.activeWord[state.activeWord.length - 1];
	}
	for (let word of state.wordAttempts) {
		if (wanted_letter === null || word.startsWith(wanted_letter)) {
			wordAttemptsHTML += `<span class="tag solved" onclick="addWord('${word}')">${word}</span>`;
		} else {
			wordAttemptsHTML += `<span class="tag" onclick="addWord('${word}')">${word}</span>`;
		}
	}
	wordAttemptsDiv.innerHTML = wordAttemptsHTML;

	// canvas stuff --------------------------------
	const { n, m, sides } = state;
	if (n < 3 || m < 1) return;

	letterPoints = [];

	const radius = Math.min(canvas.width, canvas.height) / 2.5;
	const centerX = canvas.width / 2;
	const centerY = canvas.height / 2;

	if (!sides || sides.length !== n) {
		return;
	}

	// Draw N-gon
	for (let i = 0; i < n; i++) {
		const angle1 = (2 * Math.PI * i) / n;
		const angle2 = (2 * Math.PI * (i + 1)) / n;

		const x1 = centerX + radius * Math.cos(angle1);
		const y1 = centerY + radius * Math.sin(angle1);

		const x2 = centerX + radius * Math.cos(angle2);
		const y2 = centerY + radius * Math.sin(angle2);

		// Draw side
		ctx.beginPath();
		ctx.moveTo(x1, y1);
		ctx.lineTo(x2, y2);
		ctx.strokeStyle = black_accented;
		ctx.lineWidth = 2;
		ctx.stroke();

		// Place m points on each side
		const specific_m = sides[i].length;
		for (let j = 0; j < specific_m; j++) {
			const t = (j + 1) / (specific_m + 1);
			const px = x1 + t * (x2 - x1);
			const py = y1 + t * (y2 - y1);

			const letter = sides[i][j];

			// Store letter point info
			letterPoints.push({ x: px, y: py, letter, angle1, angle2, side: i });
		}
	}

	// fill polygon with white
	ctx.beginPath();
	ctx.moveTo(centerX + radius, centerY);
	for (let i = 1; i <= n; i++) {
		const angle = (2 * Math.PI * i) / n;
		const x = centerX + radius * Math.cos(angle);
		const y = centerY + radius * Math.sin(angle);
		ctx.lineTo(x, y);
	}
	ctx.fillStyle = white_accented;
	ctx.fill();

	// Draw letters
	for (let point of letterPoints) {
		const { x, y, letter, angle1 } = point;

		// for points and letters that have been used
		if (usedLetters.has(letter)) {
			ctx.fillStyle = black_accented;
		} else {
			ctx.fillStyle = white_accented;
		}

		// Draw point
		ctx.beginPath();
		ctx.arc(x, y, 6, 0, Math.PI * 2);
		ctx.fill();
		ctx.stroke();

		// Label with letter
		ctx.font = '26px Arial';
		const pxOffset = Math.cos(angle1) * 25;
		const pyOffset = Math.sin(angle1) * 25;

		ctx.fillText(letter, x - 5 + pxOffset, y + 5 + pyOffset);
	}

	// draw lines between word points
	for (let wordsPoint of state.wordsPoints) {
		for (let i = 1; i < wordsPoint.length; i++) {
			const start = wordsPoint[i - 1];
			const end = wordsPoint[i];

			ctx.beginPath();
			ctx.setLineDash([5, 5]);
			ctx.strokeStyle = black_accented;
			ctx.lineWidth = 2;
			ctx.moveTo(start.x, start.y);
			ctx.lineTo(end.x, end.y);
			ctx.stroke();
			ctx.setLineDash([]);
		}
	}

	// draw lines between active word points
	// console.log(state.activeWordPoints);
	for (let i = 1; i < state.activeWordPoints.length; i++) {
		const start = state.activeWordPoints[i - 1];
		const end = state.activeWordPoints[i];

		ctx.beginPath();
		ctx.setLineDash([5, 5]);
		ctx.strokeStyle = red_accented;
		ctx.lineWidth = 2;
		ctx.moveTo(start.x, start.y);
		ctx.lineTo(end.x, end.y);
		ctx.stroke();
		ctx.setLineDash([]);
	}

	// highlight active word points with outline
	for (const point of state.activeWordPoints) {
		ctx.beginPath();
		ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
		ctx.fillStyle = white_accented;
		ctx.fill();
		ctx.stroke();
	}

	// highlight last point with fill
	if (state.recentPoint) {
		ctx.beginPath();
		ctx.arc(state.recentPoint.x, state.recentPoint.y, 6, 0, Math.PI * 2);
		ctx.fillStyle = red_accented;
		ctx.fill();
		ctx.stroke();
	}
}

// Function to check if a point is clicked
function getClickedPointIndex(x, y) {
	for (let i = 0; i < letterPoints.length; i++) {
		const point = letterPoints[i];
		const dx = x - point.x;
		const dy = y - point.y;
		if (Math.hypot(dx, dy) < 50) {
			// console.log(point);
			return i;
		}
	}
	return null;
}

function clickPoint(x, y) {
	const clickedIndex = getClickedPointIndex(x, y);
	// console.log(clickedIndex);
	if (clickedIndex === null) {
		return;
	}
	const clicked = letterPoints[clickedIndex];

	if (state.recentPoint?.side === clicked.side) {
		alert("You can't select two points on the same side");
		return;
	}

	state.activeWordPoints.push(clicked);
	state.activeWord += clicked.letter;

	state.recentPoint = clicked;

	render();
}

function addLetter(letter) {
	const pointIndex = letterPoints.findIndex(p => p.letter === letter);
	if (pointIndex === -1) {
		return;
	}
	const point = letterPoints[pointIndex];

	if (state.recentPoint?.side === point.side) {
		alert("You can't select two points on the same side");
		return;
	}

	state.activeWordPoints.push(point);
	state.activeWord += point.letter;

	state.recentPoint = point;

	render();
}

function checkWordValidity(word) {
	if (word.length < 3) {
		return false;
	}
	let wanted_letter = null;
	if (state.activeWord.length !== 0) {
		wanted_letter = state.activeWord[state.activeWord.length - 1];
	}
	if (wanted_letter !== null && !word.startsWith(wanted_letter)) {
		return false;
	}
	return true;
}

function addWord(word) {
	if (!checkWordValidity(word)) {
		return;
	}
	for (let letter of word) {
		addLetter(letter);
	}
	enter();
}

// Event listener for canvas clicks
canvas.addEventListener('click', (event) => {
	const rect = canvas.getBoundingClientRect();
	let x = event.clientX - rect.left;
	let y = event.clientY - rect.top;

	// scale to canvas size
	x *= canvas.width / rect.width;
	y *= canvas.height / rect.height;

	clickPoint(x, y);
});

window.addEventListener('keydown', (event) => {
	// if ctrl, shift, alt, etc. are pressed, ignore
	if (event.ctrlKey || event.shiftKey || event.altKey || event.metaKey) {
		return;
	}

	if (!state.startTime) {
		return;
	}

	if (event.key === 'Backspace') {
		backspace();
	} else if (event.key === 'Enter') {
		enter();
	} else {
		const letter = event.key.toUpperCase();
		addLetter(letter);
	}
});

function changeValue(id, delta) {
	const input = document.getElementById(id);
	let newValue = parseInt(input.value) + delta;

	// Ensure values stay within the valid range
	if (id === 'n' && newValue >= 3) {
		input.value = newValue;
	}
	if (id === 'm' && newValue >= 1) {
		input.value = newValue;
	}
}

function check_word(word) {
	if (word.length < 3) {
		alert("Word must be at least 3 letters long");
		return false;
	}
	if (wordList.length === 0) {
		alert("Dictionary not loaded yet. Please wait a few seconds and try again.");
		return false;
	}
	if (!wordList.includes(word) && !genWordList.includes(word)) {
		alert("Word not found in dictionary");
		return false;
	}
	return true;
}

function check_game_over() {
	// all letters used
	const usedLetters = new Set();
	for (let word of state.words) {
		for (let letter of word) {
			usedLetters.add(letter);
		}
	}
	for (let point of letterPoints) {
		if (!usedLetters.has(point.letter)) {
			return false;
		}
	}
	return true;
}

function check_todays_solved() {
	document.getElementById('todays').disabled = false;
	document.getElementById('todays').innerText = `Today's Puzzle`;

	let todays = localStorage.getItem('todays');
	if (!todays) {
		return false;
	}
	todays = JSON.parse(todays);
	const { numWords, date, n, m } = todays;
	const todaysDate = new Date().toDateString();
	if (date !== todaysDate) {
		return false;
	}
	if (n !== state.n || m !== state.m) {
		return false;
	}

	document.getElementById('todays').disabled = true;
	document.getElementById('todays').innerText = `Today's Puzzle (solved in ${numWords})`;
	return true;
}

function backspace() {
	state.activeWord = state.activeWord.slice(0, -1);
	state.activeWordPoints.pop();
	state.recentPoint = state.activeWordPoints[state.activeWordPoints.length - 1];

	// if active word is empty, go back one word
	if (state.activeWord.length === 0) {
		if (state.words.length !== 0) {
			state.activeWord = state.words.pop();
			state.activeWordPoints = state.wordsPoints.pop();
			state.recentPoint = state.activeWordPoints[state.activeWordPoints.length - 1];
		}
	}

	render();
}

function enter() {
	const word = state.activeWord;
	if (!check_word(word)) {
		return;
	}

	state.words.push(word);
	state.wordsPoints.push([...state.activeWordPoints]);

	state.wordAttempts.push(word);

	// keep last letter
	state.activeWord = word.slice(-1);
	state.activeWordPoints = [state.activeWordPoints[state.activeWordPoints.length - 1]];
	state.recentPoint = state.activeWordPoints[0];

	// check if game is over
	if (check_game_over()) {
		const numWords = state.words.length;
		alert(`Congratulations! You solved the puzzle using ${numWords} words.`);
		state.solved = true;

		if (playingTodays) {
			// save to local storage
			localStorage.setItem('todays', JSON.stringify({
				numWords,
				date: new Date().toDateString(),
				n: state.n,
				m: state.m,
			}));
			check_todays_solved();
		}
	}

	render();
}

function findWordsWithMLetters(wordList, m) {
	// shuffle the word list
	wordList = wordList.toSorted(() => getRand() - 0.5);

	for (let i = 0; i < wordList.length; i++) {
		if (wordList[i].length < 3) {
			continue;
		}

		// ensure no consecutive double letters
		let hasDouble = false;
		for (let j = 1; j < wordList[i].length; j++) {
			if (wordList[i][j] === wordList[i][j - 1]) {
				hasDouble = true;
				break;
			}
		}
		if (hasDouble) {
			continue;
		}

		for (let j = i + 1; j < wordList.length; j++) {
			if (wordList[j].length < 3) {
				continue;
			}

			// ensure second word starts with the last letter of the first word
			if (wordList[i][wordList[i].length - 1] !== wordList[j][0]) {
				continue;
			}

			// ensure no consecutive double letters
			let hasDouble = false;
			for (let j = 1; j < wordList[i].length; j++) {
				if (wordList[i][j] === wordList[i][j - 1]) {
					hasDouble = true;
					break;
				}
			}
			if (hasDouble) {
				continue;
			}

			const combined = wordList[i] + wordList[j];
			const uniqueLetters = new Set(combined.split(''));

			if (uniqueLetters.size === m) {
				console.log(`Words: ${wordList[i]} + ${wordList[j]} → ${[...uniqueLetters].join('')}`);
				return [wordList[i], wordList[j]];
			}
		}
	}
	alert(`No pairs found using exactly ${m} unique letters. Please try again.`);
	return null;
}

function loadGameState(stateTag) {
	if (allStates[stateTag]) {
		state = allStates[stateTag];
		const { n, m } = state;
		document.getElementById('n').value = n;
		document.getElementById('m').value = m;
		render();
		// enable other buttons
		document.getElementById('enter').disabled = false;
		document.getElementById('backspace').disabled = false;
		document.getElementById('cancelgame').disabled = false;
		document.getElementById('viewsolution').disabled = false;
		return;
	}
	// new game
	const [type, n, m] = stateTag.split('_');
	document.getElementById('n').value = n;
	document.getElementById('m').value = m;
	newGame({ todays: type === 'todays' });
}

function loadAllGameStates() {
	const allStatesStr = localStorage.getItem('letterPolygoned');
	if (!allStatesStr) {
		return;
	}
	const allStatesObj = JSON.parse(allStatesStr);
	const dateStr = new Date().toDateString();
	allStates = {};
	for (let key in allStatesObj) {
		if (allStatesObj[key].stateTag.startsWith('todays')) {
			// don't load old todays
			if (allStatesObj[key].dateStr !== dateStr) {
				continue;
			}
		}
		allStates[key] = allStatesObj[key];
	}
}

function saveAllGameStates() {
	localStorage.setItem('letterPolygoned', JSON.stringify(allStates));
}

function cancelGame() {
	if (!confirm("Are you sure you want to cancel the game?")) {
		return;
	}
	// remove from allStates
	delete allStates[state.stateTag];
	saveAllGameStates();
	state = null;
	render();
	// disable other buttons
	document.getElementById('enter').disabled = true;
	document.getElementById('backspace').disabled = true;
	document.getElementById('cancelgame').disabled = true;
	document.getElementById('viewsolution').disabled = true;
}

function newGame({ todays } = {}) {
	// ask if user wants to restart
	if (state.recentPoint && !confirm("You already have a game in progress. Do you want to start a new game?")) {
		return;
	}

	if (todays) {
		const dateStr = new Date().toDateString();
		getRand = getRandFunction(dateStr);
		playingTodays = true;
	} else {
		getRand = Math.random;
		playingTodays = false;
	}

	const n = parseInt(document.getElementById('n').value);
	const m = parseInt(document.getElementById('m').value);

	if (n < 3) {
		alert("N must be at least 3 to form a polygon");
		return;
	}
	if (m < 1) {
		alert("M must be at least 1 to place letters on each side");
		return;
	}

	const stateTag = `${playingTodays ? 'todays' : 'normal'}_${n}_${m}`;

	const numLetters = n * m;

	if (numLetters > 26) {
		alert("We have only 26 letters in the alphabet. Please choose a smaller N or M.");
		return;
	} else if (numLetters < 6) {
		alert("We need at least 6 letters to start the game. Please choose a larger N or M.");
		return;
	}

	if (wordList.length === 0) {
		return;
	}

	const solutionWords = findWordsWithMLetters(genWordList, numLetters);
	// const solutionWords = ["MAGAZINES", "SOUNDTRACK"];
	// const solutionWords = ["OUTSTANDING", "GEOGRAPHICAL"];
	// const solutionWords = ["CHAMPIONSHIP", "PERFECTLY"];
	if (!solutionWords) {
		return;
	}

	// let allLetters = new Set([...solutionWords[0], ...solutionWords[1]]);
	// allLetters = Array.from(allLetters);

	// const sides = {};
	// let currentSide = 0;
	// for (let i = 0; i < numLetters; i++) {
	// 	if (!sides[currentSide]) {
	// 		sides[currentSide] = [];
	// 	}
	// 	sides[currentSide].push(allLetters[i]);
	// 	currentSide = (currentSide + 1) % n;
	// }

	let allLetters = solutionWords[0].slice(0, -1) + solutionWords[1];
	const uniqueLetters = new Set();
	const sides = [];
	for (let i = 0; i < n; i++) {
		sides.push([]);
	}
	const letter2side = {};
	let currentSide = 0;
	for (let i = 0; i < allLetters.length; i++) {
		if (uniqueLetters.has(allLetters[i])) {
			continue;
		}
		let test = 0
		let leeway = 0;
		while (true) {
			const left_problem = i > 0 && letter2side[allLetters[i - 1]] === currentSide;
			const right_problem = i < allLetters.length - 1 && letter2side[allLetters[i + 1]] === currentSide;
			if (left_problem || right_problem || sides[currentSide].length >= m + leeway) {
				// console.log("problem", allLetters[i], currentSide, sides[currentSide].length, m + leeway);
			} else {
				break;
			}
			currentSide = (currentSide + 1) % n;
			test++;
			if (test > n) {
				leeway++;
				test = 0;
			}
			if (leeway > n) {
				alert("Puzzle generation failed. Please try again.");
				return;
			}
		}
		letter2side[allLetters[i]] = currentSide;
		sides[currentSide].push(allLetters[i]);
		uniqueLetters.add(allLetters[i]);
		// console.log("letter", allLetters[i], "side", currentSide);
		// currentSide = (currentSide + 1) % n;

		// // randomly + or -
		// const direction = Math.random() < 0.5 ? -1 : 1;
		// currentSide = (currentSide + direction + n) % n;
	}
	console.log(letter2side);

	// // shuffle sides
	// sides.sort(() => Math.random() - 0.5);
	// for (let i = 0; i < sides.length; i++) {
	// 	sides[i].sort(() => Math.random() - 0.5);
	// }

	console.log(sides);

	state = {
		n,
		m,
		sides,
		activeWord: "",
		words: [],
		activeWordPoints: [],
		wordsPoints: [],
		recentPoint: null,
		solutionWords,
		startTime: Date.now(),
		wordAttempts: [],
		stateTag,
		solved: false,
		dateStr: new Date().toDateString(),
	}

	allStates[stateTag] = state;
	saveAllGameStates();

	check_todays_solved();

	render();

	// enable other buttons
	document.getElementById('enter').disabled = false;
	document.getElementById('backspace').disabled = false;
	document.getElementById('cancelgame').disabled = false;
	document.getElementById('viewsolution').disabled = false;
}

function viewSolution() {
	if (!state.solutionWords) {
		return;
	}

	const solution = state.solutionWords.join(' - ');
	alert(`Solution: ${solution}`);
}

function todays() {
	newGame({ todays: true });
}

// fetch('https://raw.githubusercontent.com/first20hours/google-10000-english/refs/heads/master/google-10000-english.txt')
fetch('https://raw.githubusercontent.com/first20hours/google-10000-english/refs/heads/master/google-10000-english-no-swears.txt')
	.then(e => e.text())
	.then(text => {
		// remove \r
		text = text.replace(/\r/g, '');
		// make uppercase
		text = text.toUpperCase();
		genWordList = text.split('\n');
	});

fetch('https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt')
	// fetch('https://raw.githubusercontent.com/brokensandals/wordlists/refs/heads/master/lists/enable1.txt')
	// fetch('https://raw.githubusercontent.com/first20hours/google-10000-english/refs/heads/master/google-10000-english.txt')
	.then(e => e.text())
	.then(text => {
		// remove \r
		text = text.replace(/\r/g, '');
		// make uppercase
		text = text.toUpperCase();
		wordList = text.split('\n');
	});

loadAllGameStates();
if (Object.keys(allStates).length === 0) {
	newGame();
} else {
	loadGameState(Object.keys(allStates)[0]);
}
render();

// TODO
// add cute x button to remove word attempts