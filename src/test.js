const fs = require('fs')

const dir = '../model/raw/'

fs.readdir(dir, (err, files) => {
  if (err) {
    console.log(err);
  }
  const ans = []
  files.forEach(file => {
    const arr = file.split('.');
    const num = Number(arr[0])
    ans.push(num)
  })
  console.log(ans)
  ans.sort((a, b) => a - b)
  const json = JSON.stringify(ans)
  fs.writeFile('../json/valid.json', json, (err) => {
    if (err) {
      console.log('fail')
    } else {
      console.log('succ')
    }
  })
})

// const m = 10
// const n = 10
// let str = ''
// str += `${m} ${n}\n`
// for (let i = 0; i < m; i++) {
//   for (let j = 0; j < n; j++) {
//     if (Math.random() < 0.1) {
//       str += 'x'
//     } else {
//       str += ' '
//     }
//   }
//   str += '\n'
// }
// fs.writeFile('./mine.txt', str, (err) => {
//   if (err) {
//     console.log('fail')
//   } else {
//     console.log('succ')
//   }
// })

// const a = ''
// const b = ''
// console.log(a.startsWith(b))

// 'hello'  'hello'  true
// 'hello'  'h'      true
// 'hello'  ''       true
// 'hello'  'helloo' false
// ''       'hello'  false 
// ''       ''       true
// ' hello' ' h'     true

let a = [{b: 1}, {c: 2}]
let b = new Array(2)
for (let i = 0; i < 2; ++i) {
  b[i] = a[i]
}
a[0] = null
console.log(b[0].b)

let arr = [1, [2, [3, 4]]]
console.log(arr.toString())

