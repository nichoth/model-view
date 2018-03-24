var mxtend = require('xtend/mutable')

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

Model.merge = merge
module.exports = Model

