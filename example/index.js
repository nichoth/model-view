var { h, render } = require('preact')
var connect = require('../')
var models = require('./model')

var View = connect({ model: models, view: MyThing })
render(h(View, {}, []), document.body, undefined, console.log.bind(console, 'aaaaaaaaa'))

function MyThing (props) {
    console.log('props', props)
    var { state, actions } = props
    return h('div', {}, [
        h('span', {}, ['hello ' + state.foo.hello]),
        h('div', {}, [
            h('input', {
                type: 'text',
                name: 'hello',
                onInput: actions.hello
            }, [])
        ])
    ])
}

