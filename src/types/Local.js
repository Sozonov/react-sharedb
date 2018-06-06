import model from '@react-sharedb/model'
import Base from './Base'

export default class Local extends Base {
  constructor (...args) {
    super(...args)
    this.path = this.params
  }

  async init () {
    let { path } = this
    this.$model = model.at(path)
    this._listenForUpdates()
  }

  _listenForUpdates () {
    let { $model } = this
    this.listener = $model.on('all', '**', () => this.emit('update'))
  }

  _clearListeners () {
    let { $model } = this
    if (!$model) return
    if (this.listener) $model.removeListener('all', this.listener)
    delete this.$model
  }

  getData () {
    let { $model, key } = this
    let value = $model.get()
    return { [`$${key}`]: $model, [key]: value }
  }

  destroy () {
    this.destroyed = true
    this.removeAllListeners()
    try {
      this._clearListeners()
    } catch (err) {}
    delete this.params
    delete this.path
  }
}
