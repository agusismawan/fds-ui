import Head from "next/head";
import { useEffect, useState } from "react";
import * as go from "gojs";
import { ReactDiagram } from "gojs-react";
import axios from "axios";
import { useForm } from "react-hook-form";

function initDiagram() {
  const $ = go.GraphObject.make; // for conciseness in defining templates

  // some constants that will be reused within templates
  var mt8 = new go.Margin(8, 0, 0, 0);
  var mr8 = new go.Margin(0, 8, 0, 0);
  var ml8 = new go.Margin(0, 0, 0, 8);
  var roundedRectangleParams = {
    parameter1: 2, // set the rounded corner
    spot1: go.Spot.TopLeft,
    spot2: go.Spot.BottomRight, // make content go all the way to inside edges of rounded corners
  };

  const myDiagram = new go.Diagram({
    // Put the diagram contents at the top center of the viewport
    initialDocumentSpot: go.Spot.Top,
    initialViewportSpot: go.Spot.Top,
    // OR: Scroll to show a particular node, once the layout has determined where that node is
    // "InitialLayoutCompleted": e => {
    //  var node = e.diagram.findNodeForKey(28);
    //  if (node !== null) e.diagram.commandHandler.scrollToPart(node);
    // },
    layout: $(
      go.TreeLayout, // use a TreeLayout to position all of the nodes
      {
        isOngoing: false, // don't relayout when expanding/collapsing panels
        treeStyle: go.TreeLayout.StyleLastParents,
        // properties for most of the tree:
        angle: 90,
        layerSpacing: 80,
        // properties for the "last parents":
        alternateAngle: 0,
        alternateAlignment: go.TreeLayout.AlignmentStart,
        alternateNodeIndent: 15,
        alternateNodeIndentPastParent: 1,
        alternateNodeSpacing: 15,
        alternateLayerSpacing: 40,
        alternateLayerSpacingParentOverlap: 1,
        alternatePortSpot: new go.Spot(0.001, 1, 20, 0),
        alternateChildPortSpot: go.Spot.Left,
      }
    ),
  });

  // This function provides a common style for most of the TextBlocks.
  // Some of these values may be overridden in a particular TextBlock.
  function textStyle(field) {
    return [
      {
        font: "12px Roboto, sans-serif",
        stroke: "rgba(0, 0, 0, .60)",
        visible: false, // only show textblocks when there is corresponding data for them
      },
      new go.Binding("visible", field, (val) => val !== undefined),
    ];
  }

  // define the Node template
  myDiagram.nodeTemplate = $(
    go.Node,
    "Auto",
    {
      locationSpot: go.Spot.Top,
      isShadowed: true,
      shadowBlur: 1,
      shadowOffset: new go.Point(0, 1),
      shadowColor: "rgba(0, 0, 0, .14)",
      // selection adornment to match shape of nodes
      selectionAdornmentTemplate: $(
        go.Adornment,
        "Auto",
        $(go.Shape, "RoundedRectangle", roundedRectangleParams, {
          fill: null,
          stroke: "#7986cb",
          strokeWidth: 3,
        }),
        $(go.Placeholder)
      ), // end Adornment
    },
    $(
      go.Shape,
      "RoundedRectangle",
      roundedRectangleParams,
      { name: "SHAPE", fill: "#ffffff", strokeWidth: 0 },
      // gold if highlighted, white otherwise
      new go.Binding("fill", "isHighlighted", (h) =>
        h ? "gold" : "#ffffff"
      ).ofObject()
    ),
    $(
      go.Panel,
      "Vertical",
      $(
        go.Panel,
        "Horizontal",
        { margin: 8 },
        $(
          go.Panel,
          "Table",
          $(
            go.TextBlock,
            {
              row: 0,
              alignment: go.Spot.Left,
              font: "16px Roboto, sans-serif",
              stroke: "rgba(0, 0, 0, .87)",
              maxSize: new go.Size(160, NaN),
            },
            new go.Binding("text", "debetAccount")
          ),
          $(
            go.TextBlock,
            textStyle("cardNumber"),
            {
              row: 1,
              alignment: go.Spot.Left,
              maxSize: new go.Size(160, NaN),
            },
            new go.Binding("text", "cardNumber")
          ),
          $("PanelExpanderButton", "INFO", {
            row: 0,
            column: 1,
            rowSpan: 2,
            margin: ml8,
          })
        )
      ),
      $(
        go.Shape,
        "LineH",
        {
          stroke: "rgba(0, 0, 0, .60)",
          strokeWidth: 1,
          height: 1,
          stretch: go.GraphObject.Horizontal,
        },
        new go.Binding("visible").ofObject("INFO") // only visible when info is expanded
      ),
      $(
        go.Panel,
        "Vertical",
        {
          name: "INFO", // identify to the PanelExpanderButton
          stretch: go.GraphObject.Horizontal, // take up whole available width
          margin: 8,
          defaultAlignment: go.Spot.Left, // thus no need to specify alignment on each element
        },
        // $(
        //   go.TextBlock,
        //   textStyle("inputDate"),
        //   new go.Binding("text", "inputDate", (inputDate) => {
        //     const date = new Date(inputDate);
        //     return `Transaction Date : ${new Intl.DateTimeFormat(
        //       "id-ID"
        //     ).format(date)}`;
        //   })
        // ),
        $(
          go.TextBlock,
          textStyle("channelName"),
          new go.Binding(
            "text",
            "channelName",
            (channel) => `Channel : ${channel}`
          )
        ),
        $(
          go.TextBlock,
          textStyle("transactionAmount"),
          new go.Binding(
            "text",
            "transactionAmount",
            (amount) =>
              `Amount : ${new Intl.NumberFormat("ban", "id").format(amount)}`
          )
        ),
        $(
          go.TextBlock,
          textStyle("transactionTime"),
          new go.Binding("text", "transactionTime", (trxDate) => {
            const date = new Date(trxDate);
            return `Trx Date : ${new Intl.DateTimeFormat("default", {
              day: "numeric",
              month: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "numeric",
              second: "numeric",
            }).format(date)}`;
          })
        ),
        $(
          go.TextBlock,
          textStyle("parentNumber"),
          new go.Binding("margin", "channelName", (channel) => mt8), // some space above if there is also a headOf value
          new go.Binding("text", "parentNumber", (parentNumber) => {
            var parent = myDiagram.model.findNodeDataForKey(parentNumber);
            if (parent !== null) {
              return `Credit from: ${parent.debetAccount}`;
            }
            return "";
          })
        )
      )
    )
  );

  // define the Link template, a simple orthogonal line
  myDiagram.linkTemplate = $(
    go.Link,
    go.Link.Orthogonal,
    { corner: 5, selectable: false },
    $(go.Shape, { strokeWidth: 3, stroke: "#424242" })
  ); // dark gray, rounded corner links

  // create the Model with data for the tree, and assign to the Diagram
  myDiagram.model = new go.TreeModel({
    nodeParentKeyProperty: "parentNumber", // this property refers to the parent node data
  });

  // Overview
  const myOverview = new go.Overview(
    "myOverviewDiv", // the HTML DIV element for the Overview
    { observed: myDiagram, contentAlignment: go.Spot.Center }
  ); // tell it which Diagram to show and pan

  return myDiagram;
}

export default function Home() {
  const [nodeDataArray, setNodeDataArray] = useState([]);
  const [isLoading, setIsloading] = useState(false);

  function reArrange(arr) {
    if (arr[0]) {
      delete arr[0].parentNumber;
      delete arr[0].channelName;
      delete arr[0].transactionAmount;
      delete arr[0].transactionTime;
    }
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const onSubmit = (data) => {
    setIsloading(true);

    axios
      .get(
        `${process.env.NEXT_PUBLIC_API_URL}/v1.0/fraudds/?accountNumber=${data.accountNumber}&transactionDate=${data.transactionDate}`
      )
      .then((response) => {
        // Success 🎉
        let res = response.data.data;
        reArrange(res);
        setNodeDataArray(res);
        setIsloading(false);
      })
      .catch((error) => {
        // Error 😨
        if (error.response) {
          /*
           * The request was made and the server responded with a
           * status code that falls out of the range of 2xx
           */
          console.log(error.response.data);
          console.log(error.response.status);
          console.log(error.response.headers);
        } else if (error.request) {
          /*
           * The request was made but no response was received, `error.request`
           * is an instance of XMLHttpRequest in the browser and an instance
           * of http.ClientRequest in Node.js
           */
          console.log(error.request);
        } else {
          // Something happened in setting up the request and triggered an Error
          console.log("Error", error.message);
        }
        console.log(error.config);
      });
  };
  console.log(errors);

  return (
    <>
      <Head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <title>FDS UI - by Project Akrobat</title>
      </Head>
      <div style={{ marginBottom: "20px" }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <input
            type="text"
            placeholder="accountNumber"
            {...register("accountNumber", { required: true, maxLength: 15 })}
          />
          <input
            type="date"
            placeholder="transactionDate"
            {...register("transactionDate", { required: true })}
          />

          <input type="submit" />
        </form>
      </div>
      {isLoading ? (
        "Loading..."
      ) : nodeDataArray.length === 0 ? (
        ""
      ) : nodeDataArray.length === 1 ? (
        "Data not found!"
      ) : (
        <div style={{ position: "relative" }}>
          <ReactDiagram
            initDiagram={initDiagram}
            divClassName="diagram-component"
            nodeDataArray={nodeDataArray}
          />
          <div id="myOverviewDiv" className="myOverviewDiv"></div>
        </div>
      )}
    </>
  );
}
