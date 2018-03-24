var { h, Component } = require('preact')
var inherits = require('inherits')
var deepExtend = require('deep-extend')
var xtend = require('xtend')
var Model = require('./model')

function StateMachine (model, view) {
    function _StateMachine (props) {
        Component.call(this, props)
        this.state = model()
    }
    inherits(_StateMachine, Component)

    _StateMachine.prototype.componentDidMount = function () {
        var self = this
        this.unlisten = model(function onChange (state) {
            self.setState(state)
        })
    }

    _StateMachine.prototype.componentWillUnmount = function () {
        this.unlisten()
    }

    _StateMachine.prototype.render = function (props, state) {
        return h(view, xtend(props, state, {
            actions: model
        }), props.children)
    }
    return _StateMachine
}

function connect (opts) {
    var view = opts.view
    var state = deepExtend({}, opts.state)
    var actions = opts.actions
    var model = opts.model

    // connect model + view
    if (model) return StateMachine(model, view)

    // create model, then connect to view
    var model = Model(state, actions)
    if (!view) return model
    return StateMachine(model, view)
}

connect.Model = Model
connect.merge = Model.merge
module.exports = connect

