var { h, render } = require('preact')
var assert = require('assert')
var connect = require('../')

var promiseApi = {
    edit: function (data) {
        console.log('in here', data)
        return new Promise(function (resolve, reject) {
            setTimeout(function () {
                resolve(data)
            }, 1000)
        })
    }
}

var Domain = {
    state: {
        hello: 'world'
    },
    actions: {
        // mutate our state
        set: (ev, state) => { state.hello = ev },
        // do some IO and call other actions
        async: (ev, state, actions) => {
            actions.set('resolving')
            var res = promiseApi.edit({ hello: ev })
            res.then(function (data ) {
                actions.set(data.hello)
            })
            return res
        }
    }
}

// create a model
var foo = connect(Domain)

// get initial state
assert.deepEqual(foo(), { hello: 'world' },
        'should start with initial state')
console.log('init', foo())

// subscribe to state changes
foo(function onChange (state) {
    console.log('foo change', state)
})

// compose multiple models
var bar = connect(Domain)
var models = connect.merge({ foo, bar }, {
    // pass in more actions
    async: function (ev, state, actions) {
        var p = foo.async('glob')
        p.then(function (res) {
            bar.set(res.hello)
        })
    },

    hello: function (ev) {
        foo.set(ev.target.value)
        // return false to omit publishing a change event
        return false
    }
})

// references to sub-models
assert(typeof models.foo.set === 'function',
    'should reference the sub-model methods')

// get updates whenever one of the children changes
models(function onChange (state) {
    console.log('models change', JSON.parse(JSON.stringify(state)))
})

// .set is chainable because it does not return anything
// .async returns a promise
foo.set('test').async('woo').then(data => models.async(data.hello))


var View = connect({ model: models, view: MyThing })
render(h(View, {}, []), document.body)

function MyThing (props) {
    console.log('props', props)
    return h('div', {}, [
        h('span', {}, ['hello ' + props.foo.hello]),
        h('div', {}, [
            h('input', {
                type: 'text',
                name: 'hello',
                onInput: props.actions.hello
            }, [])
        ])
    ])
}

