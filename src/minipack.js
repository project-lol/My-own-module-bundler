const fs = require("fs")
const path = require("path")
const babylon = require("babylon")
const traverse = require("babel-traverse").default
const { transformFromAst } = require("babel-core")

let ID = 0

function createAsset(filename) {
  /*
    readFileSync: 
    1. 첫번째 인자로 파일의 경로를 받고, 두번째 인자로 옵션을 받는다.
    2. 옵션에는 인코딩 방식을 지정할 수 있다.
    3. 인코딩 방식을 지정하지 않으면 Buffer 객체를 반환한다.
    4. 이것이 반환하는 값은 파일의 내용이다.
    */
  const content = fs.readFileSync(filename, "utf-8")

  /*
    babylon.parse:
    1. 첫번째 인자로 파싱할 코드를 받고, 두번째 인자로 옵션을 받는다.
    2. 옵션에는 sourceType 이라는 속성이 있는데, 이 속성은 파싱할 코드의 타입을 지정한다.
    3. sourceType 의 값으로는 "script" 또는 "module" 이 있다.
    4. "script" 는 기본값이며, "module" 은 ES6 모듈을 의미한다.
    5. babylon.parse 는 AST(Abstract Syntax Tree) 를 반환한다.
*/
  const ast = babylon.parse(content, {
    sourceType: "module",
  })

  const dependencies = []

  traverse(ast, {
    ImportDeclaration: ({ node }) => {
      dependencies.push(node.source.value)
    },
  })

  // 각각의 모듈에 고유한 식별자를 부여한다.
  const id = ID++

  /*
    transformFromAst:
    1. 첫번째 인자로 AST 를 받고, 두번째 인자로 변환할 코드를 받는다.
    2. 세번째 인자로 옵션을 받는데, 이 옵션에는 presets 이라는 속성이 있다.
    3. presets 은 변환할 코드를 어떤 방식으로 변환할지 지정하는 속성이다.
    4. 이 속성에는 "env" 라는 속성이 있는데, 이 속성은 ES6 코드를 ES5 코드로 변환한다.
    5. transformFromAst 는 변환된 코드를 반환한다.
  */
  const { code } = transformFromAst(ast, null, {
    presets: ["env"],
  })

  return {
    id,
    filename,
    dependencies,
    code,
  }
}

function createGraph(entry) {
  const mainAsset = createAsset(entry)
  const queue = [mainAsset]

  for (const asset of queue) {
    asset.mapping = {}

    const dirname = path.dirname(asset.filename)

    asset.dependencies.forEach(relativePath => {
      const absolutePath = path.join(dirname, relativePath)
      const child = createAsset(absolutePath)
      asset.mapping[relativePath] = child.id
      queue.push(child)
    })
  }
  return queue
}
