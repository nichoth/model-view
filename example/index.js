var { h, render, Component } = require('preact')
var assert = require('assert')
var Store = require('@nichoth/state')
var xtend = require('xtend')
var mxtend = require('xtend/mutable')
var deepExtend = require('deep-extend')

var MyStore = Store.extend({
    _state: { hello: 'world' },
    set: function (val) {
        this._state.hello = val
        return this.publish()
    }
})

function Actions (store) {
    var actions = {
        componentDidMount: function (props) {
            store.set('hmm')
            setTimeout(function () {
                store.set('ok')
            }, 2000)
        },

        hello: function (ev) {
            console.log('here', ev)
            ev.preventDefault()
            store.set(ev.target.value)
        }
    }
    return actions
}

function MyThing (props) {
    console.log('props', props)
    return h('div', {}, [
        h('span', {}, ['hello ' + props.hello]),
        h('div', {}, [
            h('input', {
                type: 'text',
                name: 'hello',
                onInput: props.actions.hello
            }, [])
        ])
    ])
}

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
        set: (ev, state) => { state.hello = ev },
        async: (ev, state, actions, publish) => {
            actions.set('resolving')
            var res = promiseApi.edit({ hello: ev })
            res.then(function (data ) {
                actions.set(data.hello)
            })
            return res
        }
    }
}

var foo = connect(Domain)
var bar = connect(Domain)

var models = merge({ foo, bar }, {
    async: function (ev, state, actions) {
        var p = foo.async('glob')
        p.then(function (res) {
            bar.set(res.hello)
        })
    }
})

models(function onChange (state) {
    console.log('models change', JSON.parse(JSON.stringify(state)))
})

assert(typeof models.foo.set === 'function',
    'should reference the sub-models function')

console.log('init', foo())
foo(function onChange (state) {
    console.log('foo change', state)
})

foo.set('test').async('woo').then(data => models.async(data.hello))

function merge (models, actions) {
    var states = Object.keys(models).reduce(function (acc, k) {
        acc[k] = models[k]()
        return acc
    }, {})

    var parentModel = Model(states, actions)
    Object.keys(models).forEach(function (k) {
        models[k](function onChange (state) {
            parentModel._publish()
        })
        parentModel[k] = models[k]
    })

    return parentModel
}


function connect (opts) {
    var view = opts.view
    var state = deepExtend({}, opts.state)
    var actions = opts.actions
    var model = opts.model
    if (model) return // ... connect model + view

    // create model, then connect to view
    var model = Model(state, actions)
    if (!view) return model
}

function Model (state, actions) {
    var listeners = []
    function _state (onChange) {
        if (!onChange) return state
        var i = listeners.length
        listeners.push(onChange)
        return function unlisten () {
            listeners.splice(i, 1)
        }
    }

    function publish () {
        listeners.forEach(function (fn) {
            fn(state)
        })
    }

    var _actions = Object.keys(actions).reduce(function (acc, k) {
        acc[k] = function (ev) {
            var update = actions[k](ev, state, _actions, publish)
            if (update === false) return _state
            if (update) return update
            publish()
            return _state
        }
        return acc
    }, {})

    mxtend(_state, _actions)
    _state._publish = publish
    return _state
}



function Link (opts) {
    var view = opts.view
    var actions = opts.actions
    var state = opts.state

    return class extends Component {
        constructor(props) {
            super(props)
            if (state) {
                var self = this
                this.state = state()
                this.unlisten = state(function (_state) {
                    self.setState(_state)
                })
            }
        }

        componentWillMount() {
            if (actions.componentWillMount) {
                actions.componentWillMount(this.props)
            }
        }

        componentDidMount() {
            if (actions.componentDidMount) {
                actions.componentDidMount(this.props)
            }
        }

        componentWillUnmount() {
            if (this.unlisten) this.unlisten()
            if (actions.componentWillUnmount) {
                actions.componentWillUnmount(this.props)
            }
        }

        render(props, state) {
            return h(view, xtend(props, state, {
                actions: actions
            }), props.children)
        }
    }
}

var store = MyStore()
render(h(Link({
    view: MyThing,
    actions: Actions(store),
    state: store.state.bind(store)
}), {}, []), document.body)

