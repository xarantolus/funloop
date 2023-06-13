### Weird loop transformations
This project transforms, if possible, JavaScript code into a more cursed form.
It tries to put the loop body into the loop condition/update part.


### Examples

<table>
<tr>
<td> Before </td> <td> After </td>
</tr>
<tr>
<td>

```js
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
```

</td>
<td>

```js
function insertionSort(arr) {
  for (i = 1; i < arr.length; i++) {
    t = arr[i];
    j = i - 1;
    while (j >= 0 && arr[j] > t && (arr[j + 1] = arr[j], j--, true));
    arr[j + 1] = t;
  }
  return arr;
}
```

</td>
</tr>
<tr>
<td>

```js
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
```

</td>
<td>

```js
function binarySearch(arr, target) {
  l = 0;
  r = arr.length - 1;
  while (l <= r) {
    mid = l + r >> 1;
    if (arr[mid] == target) {
      return mid;
    } else arr[mid] < target ? l = mid + 1 : r = mid - 1;
  }
  return -1;
}
```

</td>
</tr>

<tr>
<td>

```js
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
```

</td>
<td>

```js
function maxSubArray(arr) {
  max = -Infinity;
  sum = 0;
  for (i = 0; i < arr.length; sum += arr[i],
  	max = Math.max(max, sum),
	sum = sum < 0 ? 0 : sum, i++);
  return max;
}
```

</td>
</tr>
</table>

### Contributing
If you have any other ideas of stuff that can be made more cursed, feel free to open an issue or pull request :)

### [License](LICENSE)
This is free as in freedom software. Do whatever you like with it.
