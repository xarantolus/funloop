import './style.css'
import { basicSetup } from "codemirror"
import { EditorState, Compartment } from "@codemirror/state"
import { javascript } from "@codemirror/lang-javascript"
import { EditorView, keymap } from "@codemirror/view"
import { oneDark } from "@codemirror/theme-one-dark"

import { transformCode } from './optimize'


const extensions = [
  basicSetup,
  oneDark,
]

const compartment = new Compartment()

// Just some real-world typical code that has some functions that contain for loops
// These functions obviously are just meme material as they are not very useful in javascript
const exampleCode = `function strlen(str) {
  let len = 0
  for (let i = 0; i < str.length; i++) {
    len++
  }
  return len
}
function binarySearch(arr, target) {
  let l = 0
  let r = arr.length - 1
  while (l <= r) {
    let mid = (l + r) >> 1
    if (arr[mid] == target) {
      return mid
    } else if (arr[mid] < target) {
      l = mid + 1
    } else {
      r = mid - 1
    }
  }
  return -1
}
function maxSubArray(arr) {
  let max = -Infinity
  let sum = 0
  for (let i = 0; i < arr.length; i++) {
    sum += arr[i]
    max = Math.max(max, sum)
    if (sum < 0) {
      sum = 0
    }
  }
  return max
}
function insertionSort(arr) {
  for (let i = 1; i < arr.length; i++) {
    let t = arr[i];
    let j = i - 1;
    while (j >= 0 && arr[j] > t) {
      arr[j + 1] = arr[j]
      j--
    }
    arr[j+1] = t
  }
  return arr;
}
function sumDigits(n) {
  let sum = 0;
  do {
    sum += n % 10;
    n = Math.floor(n / 10);
  } while (n > 0);
  return sum;
}
`

const code = localStorage.getItem('code') || exampleCode;

const state = EditorState.create({
  doc: code,
  extensions: [
    ...extensions,
    javascript(),
    keymap.of([]),
    compartment.of([]),
  ],
})

const view = new EditorView({
  state,
  parent: document.getElementById("editor")!,
})

// window.view = view
// window.state = state
// window.compartment = compartment

const optimizeButton = document.getElementById('optimize')!;

optimizeButton.addEventListener('click', () => {
  const code = view.state.doc.toString()
  const optimizedCode = transformCode(code)
  view.dispatch({
    changes: {
      from: 0,
      to: view.state.doc.length,
      insert: optimizedCode,
    },
  })
});
