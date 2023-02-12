# My Own Module Bundler

> 모듈 번들러의 내부동작을 이해하기 위해 직접 만들어보는 프로젝트입니다.

<br>

## What I Learned

### 모듈 번들러의 역할

- 모듈 번들러는 코드의 작은 코드를 모아 하나의 파일로 만들어주는 도구입니다. 이 작은 코드의 단위를 모듈이라고 합니다.

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
