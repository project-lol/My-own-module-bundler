# My Own Module Bundler

> 모듈 번들러의 내부동작을 이해하기 위해 직접 만들어보는 프로젝트입니다.

<br>

## What I Learned

### 모듈 번들러의 역할

- 모듈 번들러는 코드의 작은 코드를 모아 하나의 파일로 만들어주는 도구이다. 이 작은 코드의 단위를 모듈이라고 한다.

<br>

### Entry file과 Dependency Graph

- 모듈 번들러는 entry file이라는 개념을 가지고 있다. 브라우저에 script 태그를 넣어서 그것들을 실행하는 대신에, 번들러에게 어떤 파일이 어플리케이션의 메인 파일이 되는지를 알려준다. 이 메인 entry file은 어플리케이션의 시작점이 되는 파일이다.
- 우리가 만든 번들러는 그 entry file을 읽고, 그 안에서 의존하고 있는 것들을 찾아낸다. 그 파일들을 찾아가서 그 파일들 안에 의존하고 있는 파일들을 찾아낸다. 이런식으로 모든 의존성을 찾아내고, 더 이상 아무 파일도 남지 않을때까지 다 찾아낸다. 이렇게 만들어진 그래프를 우리는 Dependency Graph(의존성 그래프)라고 부른다.

<br>

### AST(Abstract Syntax Tree)

- 하나의 파일안에 어떤 의존성이 존재하는지를 파악하기 위해서 js 파서를 이용할 것이다. 그리고 js 파서는 AST를 만들어낸다. AST는 js 파일을 구성하는 모든 구문을 표현하는 트리이다. AST가 무엇인지 궁금하다면 https://astexplorer.net 에서 확인해보자. 여기서 이것저것 코드를 입력해보면 어떻게 AST 트리가 구성되는지 직접확인할 수 있다.
- AST는 코드에 대한 많은 정보를 포함하고 있다. 우리는 AST를 이용해서 의존성을 파악할 것이다.

```js
const ast = babylon.parse(content, {
  sourceType: "module",
})
```

<br>

### AST 파일을 Traverse해서 의존성 파악하기

- AST를 순회하면서 의존성을 파악할 것이다. AST를 순회하는 방법은 여러가지가 있지만, 여기서는 babel의 traverse를 이용할 것이다. traverse는 AST를 순회하면서 원하는 노드를 찾을 수 있다. 여기서는 ImportDeclaration 노드를 찾을 것이다. ImportDeclaration 노드는 import 구문을 의미한다.
- EcmaScript 모듈은 static하다. 이것이 의미하는 것은 변수를 import할 수 없으며, 조건부로 다른 모듈을 import할 수 없다는 것이다. 때문에 그냥 import 구문을 찾으면 바로 의존성 목록에 추가하면 된다.

```js
const dependencies = []

traverse(ast, {
  ImportDeclaration: ({ node }) => {
    dependencies.push(node.source.value)
  },
})
```

<br>

### Babel을 이용해서 코드 변환하기

- 우리의 코드에는 모든 브라우저에서 지원하지 않는 코드가 존재할 수 있다. 예를 들어서 arrow function이나 class 문법이 있다. 이런 코드들은 브라우저에서 실행할 수 없기 때문에, 이런 코드들을 변환해주는 작업이 필요하다. 이런 작업을 위해서 babel을 사용할 것이다.

```js
const { code } = transformFromAst(ast, null, {
  presets: ["env"],
})
```

<br>

### createGraph

- 이제 모든 의존성을 파악했으니, 이 의존성을 가지고 dependency graph를 만들어보자. 먼저, createGraph라는 함수를 만든다. 이 함수는 entry file을 받아서, 그 파일을 읽고, 의존성을 파악하고, 의존성을 가지고 다시 그 의존성을 파악하는 작업을 반복한다. 이렇게 만들어진 dependency graph를 리턴한다.

```js
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
```

- 이렇게 만들어진 dependency graph는 아래와 같은 형태를 가진다.

```js
[
  {
    id: 1,
    filename: '/Users/____/Projects/own-module-bundler/src/a.js',
    dependencies: [ './b.js', './c.js' ],
    code: '"use strict";\n\nvar _b = _interopRequireDefault(require("./b.js"));\n\nvar _c = _interopRequireDefault(require("./c.js"));\n\nfunction _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }\n\nconsole.log("a.js");\n(0, _b.default)();\n(0, _c.default)();',
    mapping: { './b.js': 'b', './c.js': 'c' }
  },
  {
    id: 2,
    filename: '/Users/____/Projects/own-module-bundler/src/b.js',
    dependencies: [ './d.js' ],
    code: '"use strict";\n\nvar _d = _interopRequireDefault(require("./d.js"));\n\nfunction _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }\n\nconsole.log("b.js");\n(0, _d.default)();',
    mapping: { './d.js': 'd' }
  },
    ...
]
```

<br>

### bundle

- 만들어진 graph를 활용해서 bundle을 만든다. 이 번들은 브라우저에서 실행될 수 있는 코드다.
- 먼저, IIFE를 만든다. IIFE는 Immediately Invoked Function Expression의 약자로, 함수를 선언하고 바로 실행하는 것을 의미한다. 이렇게 만들어진 IIFE는 브라우저에서 바로 실행될 수 있다.
- 그 다음, graph를 순회하면서 각각의 모듈을 require 함수로 감싸고, require 함수는 각각의 모듈을 실행시키는 역할을 한다. 그리고 각각의 모듈은 module.exports를 통해서 export한 값을 리턴한다. 그리고 그 값을 변수에 할당한다. 그리고 그 변수를 mapping에 따라서 export한다.
