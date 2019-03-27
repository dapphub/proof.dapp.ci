import './bla.scss';

const xs = require("xstream").default;
const flattenSequentially = require("xstream/extra/flattenSequentially").default;
const dropRepeats = require("xstream/extra/dropRepeats").default;
const {run} = require("@cycle/run");
const {makeHTTPDriver} = require('@cycle/http');
const {makeHistoryDriver} = require("@cycle/history");
const onionify = require('cycle-onionify').default;
const {button, code, div, label, input, hr, h1, makeDOMDriver} = require('@cycle/dom')

const move = require("./klab/lib/move.js");
const view = require("./webview.js");

const drivers = {
  HTTP: makeHTTPDriver(),
  DOM: makeDOMDriver('#root'),
  history: makeHistoryDriver()
};

const main = ({HTTP, DOM, onion, history}) => {

  const load$ = onion.state$
    .filter(state => state.proofid && state.proofid.length == 64)
    .map(state => state.proofid)
    .compose(dropRepeats())
    .map(proofid => ({
      category: "boot",
      url: `boot_${proofid}.json`
    }))

  const move$ = DOM
    .select("button")
    .events("click")
    .map(e => ({cmd: e.currentTarget.className}))
    .compose(move)

  const moveBranch$ = DOM
    .select(".node.branching")
    .events("click")
    .map(e => ({cmd: "branch " + e.ownerTarget.dataset.index}))
    .compose(move)

  const bootstrap$ = HTTP
    .select('boot')
    .compose(flattenSequentially)
    .map(resp => state => {
      const data = JSON.parse(resp.text)
      const coedges = Object.keys(data.edges)
        .reduce((coedges, from) =>
          data.edges[from]
          .reduce((a, toO) => ({...a, [toO.to]: (a[toO.to]||[]).concat(toO)}), coedges)
          , {})
      console.log(data);
      return {
        loaded: true,
        ...data,
        coedges
      };
    })

  const remember_proofid$ = history
    .debug()
    .map(h => state => ({
      ...state,
      proofid: h.hash.slice(1)
    }))

  const vdom$ = onion.state$
    .map(state => {
      if(state.loaded) {
        return view(state)
      } else {
        return div([
          input({
            type: "text"
          }),
          button("GO"),
          code(JSON.stringify(state, false, 2))
        ])
      }
    })

  return {
    DOM: vdom$,
    HTTP: xs.merge(
      load$
    ),
    onion: xs.merge(
      move$,
      moveBranch$,
      bootstrap$,
      remember_proofid$
    )
  }
}

const wrappedMain = onionify(main);

run(wrappedMain, drivers)
