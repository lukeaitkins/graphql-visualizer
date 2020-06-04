import Head from "next/head";
import Graph from "../components/Graph";
import { useEffect, useState, useMemo } from "react";

const checkType = (type) => {
  switch (type.kind) {
    case "OBJECT":
      return { name: type.name, extras: [], isEdge: true };
    case "LIST":
    case "NON_NULL":
      if (type.ofType) {
        const f = checkType(type.ofType);
        return f ? { ...f, extras: [...f.extras, type.kind] } : f;
      }
    default:
      return { name: type.name, extras: [], isEdge: false };
  }
};

const formatWithExtras = (name, extras) => {
  return extras.reduce((n, extra) => {
    switch (extra) {
      case "LIST":
        return <>[{n}]</>;
      case "NON_NULL":
        return <>{n}!</>;
    }
  }, name);
};

const removePagination = (str) => str.replace("Paginator", "");

export default function Home() {
  const [url, setUrl] = useState("https://api.spacex.land/graphql/");
  const [urlForm, setUrlForm] = useState("https://api.spacex.land/graphql/");
  const [selected, setSelected] = useState();
  const [nodes, setNodes] = useState();
  const [edges, setEdges] = useState();

  useEffect(() => {
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `{
          __schema {
            types {
              name
              kind
              fields {
                name
                type {
                  name
                  kind
                  ofType{
                    name
                    kind
                    ofType {
                      name
                      kind
                      ofType {
                        name
                        kind
                      }
                    }
                  }
                }
              }
            }
          }
        }`,
      }),
    })
      .then((res) => res.json())
      .then((res) => {
        const types = res.data.__schema.types.map((t) => ({
          name: t.name,
          kind: t.kind,
          fields: (t.fields || []).map((t) => ({
            name: t.name,
            type: checkType(t.type),
          })),
          isRoot: false,
        }));

        types
          .find((t) => t.name === "Query")
          .fields.forEach((f) => {
            types.find((t) => t.name === f.type.name).isRoot = true;
            types.find(
              (t) => t.name === removePagination(f.type.name)
            ).isRoot = true;
          });

        setNodes(
          types.filter(
            (t) => t.name.substr(0, 1) !== "_" && t.kind === "OBJECT"
          )
        );
        setEdges(
          types.reduce(
            (acc, t) => [
              ...acc,
              ...t.fields
                .filter(
                  (t) => t.type.isEdge && t.type.name.substr(0, 1) !== "_"
                )
                .map((f) => ({
                  from: t.name,
                  to: f.type.name,
                  name: f.name,
                  extras: f.type.extras,
                })),
            ],
            []
          )
        );
      });
  }, [url]);

  const graphData = useMemo(
    () =>
      nodes &&
      edges && {
        nodes: nodes
          .filter((n) => n.name !== "Query" && n.name !== "Mutation")
          .map((n) => ({
            id: n.name,
            isRoot: n.isRoot,
          })),
        links: edges
          .filter(
            ({ from, to }) =>
              from !== "Query" &&
              from !== "Mutation" &&
              from !== "PaginatorInfo" &&
              to !== "PaginatorInfo"
          )
          .map((e) => ({
            source: removePagination(e.from),
            target: removePagination(e.to),
            name: e.name,
          })),
      },
    [nodes, edges]
  );

  return (
    <div>
      <Head>
        <title>GraphQL Visualisor</title>
        <link rel="icon" href="/favicon.ico" />
        <style>{`
          a {
            font-weight: bold;
          }
          a:hover {
            text-decoration: underline !important;
          }
          .graph-holder canvas {
            border: 1px solid grey;
          }
          .graph-holder {
            display: flex;
          }
        `}</style>
      </Head>

      <main className="container">
        <h1 className="text-center my-3">GraphQL Visualiser</h1>
        <div className="row pb-3 justify-content-center">
          <input value={urlForm} onChange={(e) => setUrlForm(e.target.value)} />
          <button type="submit" onClick={() => setUrl(urlForm)}>
            Update
          </button>
        </div>
        <div class="row">
          {selected ? (
            <div className="col-md-3">
              <button
                onClick={() => setSelected()}
                className="btn btn-secondary mb-3"
              >
                Home
              </button>
              <h2 className="pb-3">{selected}</h2>
              {nodes
                .find((n) => n.name === selected)
                .fields.map((n) => (
                  <>
                    <li>
                      {n.name}:{" "}
                      {formatWithExtras(
                        n.type.isEdge ? (
                          <a onClick={() => setSelected(n.type.name)}>
                            {n.type.name}
                          </a>
                        ) : (
                          <span class="font-italic">{n.type.name}</span>
                        ),
                        n.type.extras
                      )}
                    </li>
                  </>
                ))}
            </div>
          ) : (
            <div className="col-md-3">
              <h2 className="pb-3">Schema</h2>
              {nodes && edges && (
                <>
                  {nodes.map((n) => (
                    <>
                      <li>
                        <a onClick={() => setSelected(n.name)}>{n.name}</a>
                        <ul>
                          {edges
                            .filter((e) => e.from === n.name)
                            .map((e) => (
                              <li>
                                {e.name}:{" "}
                                {formatWithExtras(
                                  <a onClick={() => setSelected(e.to)}>
                                    {e.to}
                                  </a>,
                                  e.extras
                                )}
                              </li>
                            ))}
                        </ul>
                      </li>
                    </>
                  ))}
                </>
              )}
            </div>
          )}
          <div class="col-md-9">
            {nodes && edges ? (
              <Graph
                data={graphData}
                onSelect={(node) => setSelected(node.id)}
              />
            ) : (
              <h4>Loading...</h4>
            )}
          </div>
        </div>
      </main>

      <footer className="text-center">
        By Luke Aitkins
        <br />
        Others recommended: https://api.graphql.jobs/
      </footer>
    </div>
  );
}
