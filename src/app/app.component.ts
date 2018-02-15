import { Component, OnInit, ElementRef, NgZone} from '@angular/core';
import {
  D3Service,
  D3,
  Selection
} from 'd3-ng2-service';
import * as d3Sankey from 'd3-sankey';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'app';
  private d3: D3;
  private parentNativeElement: any;
  private d3Svg: Selection<SVGSVGElement, any, null, undefined>;

  sankeyStep = 1;
  globalNodeInOutStatus = null;
  globalDepthInOutStatus = null;
  maxSankeyChartDepth = 0;
  maxNodeLength = 0;
  receiveRawData = null;

  loadSankeyChartDataSet() {
     this.receiveRawData = this.sankeyChartData;
     this.drawSankeyChart(
               this.extractCurDepthSankeyData(
                   this.refineSankeyChartData(this.receiveRawData),
                   this.sankeyStep)
     );
  }

  refineSankeyChartData(data)
  {

        let maxDepth = 0;

        let nodes = [];
        for(let i = 0; i < data.length; i++)
        {
          let node = data[i];
          if(!nodes[node.depth -1])
            nodes[node.depth - 1] = [];

          if(!nodes[node.depth])
            nodes[node.depth] = [];

          nodes[node.depth - 1].push(node.source);
          nodes[node.depth].push(node.target);

          //to find max depth
          if ((node.depth * 1) > maxDepth)
            maxDepth = node.depth * 1;
        }


        this.setMaxSankeyChartDepth(maxDepth);
        this.sankeyStep = maxDepth;
        console.log(nodes);
        /** make nodes set step2 - remove duplicated nodes */
        for(let i = 0; i < nodes.length; i++)
        {
          let depthList = nodes[i];
          let uniqueArray = [];
          for(let j = 0; j < depthList.length; j++)
          {
            let match = false;
            for(let b = 0; b < uniqueArray.length; b++)
            {
               if(depthList[j] == uniqueArray[b])
               {
                 match = true;
                 break;
               }
            }
            if(!match)
              uniqueArray.push(depthList[j]);
          }
          nodes[i] = uniqueArray;
        }

        console.log(nodes);
        let maxNodeLength = 0;
        let nodeIndex = 0;
        let nodeList = [];

        for(let i = 0; i < nodes.length; i++)
        {
          if(nodes[i].length > maxNodeLength)
           maxNodeLength = nodes[i].length;

          let curDepth = i;
          for(let j = 0; j < nodes[i].length; j++)
          {
            nodeList.push({node: nodeIndex, name:nodes[i][j] , depth: curDepth});
            nodeIndex++;
          }
        }

        this.setMaxNodeLength(maxNodeLength);

        let linkList = [];
        for(var i = 0; i < data.length;i++)
        {
            let node = data[i];
            let source = node.source;
            let target = node.target;
            let depth = node.depth;
            for(let k =0; k < nodeList.length; k++)
 			{
                if(source == nodeList[k].name && (depth - 1) == nodeList[k].depth)
		{
                    source = nodeList[k].node;
                    break;
                }
            }
            for(let k =0;k < nodeList.length;k++){
                if(target == nodeList[k].name && depth == nodeList[k].depth) {
                    target = nodeList[k].node;
                    break;
                }
            }
            linkList.push({source: source, target: target, value: node.value, depth: depth})
        }

        return {nodes: nodeList, links: linkList};
  }

  extractCurDepthSankeyData(sankeyData, depth)
  {


     let oldNodes = sankeyData.nodes;
     let oldLinks = sankeyData.links;
     let newNodes = [];
     let newLinks = [];
     let endNodeIndex = 0;
     let nodeInOutStatus = [];
     let depthInOutStatus = [];

     /** extract nodes */
     for(let i = 0; i < oldNodes.length; i++)
     {
       let element = oldNodes[i];
       if (element.depth <= depth)
       {
          newNodes.push(element);
          endNodeIndex = element.node + 1;
          nodeInOutStatus.push({node: element.node, in: 0, out: 0});

          if (!depthInOutStatus[element.depth])
            depthInOutStatus.push({depth: element.depth, in: 0, out: 0});
       }
     }

     /** extract links */
     for(let i = 0; i < oldLinks.length; i++)
     {
        let element = oldLinks[i];
        //exist link
        if (element.depth <= depth)
          newLinks.push(element);

        //out of page calculate to make  OUT of page link
        if (element.depth <= depth + 1)
        {
           let s = element.source;
           let t= element.target;
           let v = element.value * 1;  //string to number

           if(nodeInOutStatus[t])
             nodeInOutStatus[t].in = nodeInOutStatus[t].in + v;

           if(nodeInOutStatus[s])
             nodeInOutStatus[s].out = nodeInOutStatus[s].out + v;

           //make depthInOutStatus
           if(depthInOutStatus[element.depth])
           {
             depthInOutStatus[element.depth].in = depthInOutStatus[element.depth].in + v;
             depthInOutStatus[element.depth - 1].out = depthInOutStatus[element.depth - 1].out + v;
           }
        }
       }

       /** append calculated page link */
      /* if (depth > 1)
       {
          //add out of page node for pretty sankey chart when depth is bigger than depth 1.
          //newNodes.push({node: endNodeIndex, name: "OUT", depth: depth});

          //add out of page link for pretty sankey chart
          for(let i = 0; i < nodeInOutStatus.length; i++)
          {
             let element = nodeInOutStatus[i];
             let diffInOut = element.in - element.out;
             let calDepth = (newNodes[element.node].depth < depth);

             if (diffInOut > 0 && calDepth) {
                   newLinks.push({
                       source: element.node,
                       target: endNodeIndex,
                       value: element.in - element.out,
                       depth: depth
                   });
             }
         }
       }*/

       this.globalNodeInOutStatus = nodeInOutStatus;
       this.globalDepthInOutStatus = depthInOutStatus;

       return {nodes: newNodes, links: newLinks};
  }

  drawSankeyChart(refineSankeyData) {

    var NODE_WIDTH = 200;
       var NODE_PADDING = 40;
       var DEPTH_WIDTH = 350;

       var margin = {top: 70, right: 20, bottom: 0, left: 20};
       var width = 550 + ((this.sankeyStep - 1) * DEPTH_WIDTH) + 150;
       var sankeyWidth = width - 150;  //for next/previous button
       var height = this.getMaxNodeLength() * 100 + margin.top;

       /** sankeyChart-area size */

       //$('#sankey').css("width", width + margin.left + margin.right).css("height", height + margin.top + margin.bottom);


         var formatNumber = this.d3.format(",.0f"),
             format = function (d: any) { return formatNumber(d) + " Sessions"; },
             color = this.d3.scaleOrdinal(this.d3.schemeCategory10);


       var svg = this.d3.select("#sankey").append("svg")
           .attr("width", width + margin.left + margin.right)
           .attr("height", height + margin.top + margin.bottom)
           .append("g")
           .attr("transform", "translate(" + margin.left + "," + margin.top + ")");



                  var sankey = d3Sankey.sankey()
                      .nodeWidth(NODE_WIDTH)
                      .nodePadding(NODE_PADDING)
                      .size([sankeyWidth, height]);


              /** init sankeyDataSet */
              let sankeyDataSet = refineSankeyData;
                if (sankeyDataSet) {
                  var link = svg.append("g")
                      .attr("class", "links")
                      .attr("fill", "none")
                      .attr("stroke", "#000")
                      .attr("stroke-opacity", 0.2)
                      .selectAll("path");

                  var node = svg.append("g")
                      .attr("class", "nodes")
                      .attr("font-family", "sans-serif")
                      .attr("font-size", 14)
                      .attr("font-weight", 600)
                      .selectAll("g");


                    let depthInfo = svg.append("g").selectAll(".depthInfo")
                        .data(this.globalDepthInOutStatus)
                        .enter().append("g")
                        .attr("class", "depthInfo");
                         depthInfo.append("rect")
                        .attr("height", 50)
                        .attr("width", NODE_WIDTH)
                        .attr("x", function (d) {
                            return d["depth"] * DEPTH_WIDTH;
                        })
                        .attr("y", -80)
                        .style("fill", "#F5F6CE")
                        .append("title")
                        .text(function (d) {
                            if(d["depth"] == 0) return "";
                            return d["depth"] + 'STEP';
                        });



                    
                    depthInfo.append("text")
                        .attr("y", -60)
                        .append('svg:tspan')
                        .attr("x", function (d) {
                            return (d["depth"] * DEPTH_WIDTH) + 5;//plus padding
                        })
                        .attr('dy', 5)
                        .attr("fill", "red")
                        .text(function (d) {
                            if(d["depth"] == 0) return "";
                            return d["depth"] + 'Step';
                        })
                        .append('svg:tspan')
                        .attr("x", function (d) {
                            return (d["depth"] * DEPTH_WIDTH) + 5;//plus padding
                        })
                        .attr('dy', 20)
                        .text(function (d) {
                            
                            if(d["depth"] == 0) return ""; 
                            var returnString = d["in"] + ' sessions, ' + d["out"] + ' through, ';
                            if (d["depth"] > 1) {
                                returnString += (d["in"] - d["out"]) + ' drop-offs';
                            }
                            return returnString;
                        })
                        .attr("fill", "black");

               sankey(sankeyDataSet);

               link = link
                       .data(sankeyDataSet.links)
                       .enter().append("path")
                       .attr("d", d3Sankey.sankeyLinkHorizontal())
                       .attr("stroke-width", function (d: any) { return Math.max(1, d.width); })
                       .attr("id", function (d:any, i) {
                   d.id = i;
                   return "link-" + i;
               });

                   link.append("title")
                       .text(function (d: any) { return d.source.name + " → " + d.target.name + "\n" + format(d.value); });
           /*
            var tip = d3.tip()
                .attr('class', 'd3-tip')
                .offset([-10, 0])
                .html((d:any) => {

                    if (d.depth == 0 || d.name == 'OUT') {
                        return "<strong>Page :</strong> <span style='color:red'>" + d.name + "</span>";
                    }

                    var inVal = this.globalNodeInOutStatus[d.node].in;
                    var outVal =this.globalNodeInOutStatus[d.node].out;
                    var outPage = inVal - outVal;

                     return "";
                });

             */      node = node
                       .data(sankeyDataSet.nodes)
                       .enter().append("g");

                   node.append("rect")
                       .attr("x", function (d: any) { return d.x0; })
                       .attr("y", function (d: any) { return d.y0; })
                       .attr("height", function (d: any) { return d.y1 - d.y0; })
                       .attr("width", function (d: any) { return d.x1 - d.x0; })
                       .attr("fill", "#5D6D7E")//function (d: any) { return color(d.name.replace(/ .*/, "")); })
                       .attr("stroke", "#fff")
                       .style("cursor","pointer")
                       .attr("text-anchor", "start").on("click",(event) => { this.highlight_node_links(event,0) });
                   node.append("text")
                       .attr("x", function (d: any) { return d.x0 + 50; })
                       .attr("y", function (d: any) { return (d.y1 + d.y0) / 2; })
                      // .attr("dy", "0.35em")
                       //.attr("text-anchor", "end")
                       .text(function (d: any) { return d.name; })
                       .filter(function (d: any) { return d.x0 < width / 2; })
                      // .attr("x", function (d: any) { return d.x1 + 6; })
                       .attr("text-anchor", "start").on("click",(event) => { this.highlight_node_links(event,0) });
           /*
            node.call(tip)
                .on("mouseover", tip.show)
                .on("mouseout", tip.hide);*/
                   node.append("title")
                       .text(function (d: any) { return d.name + "\n" + format(d.value); });
}

  }


           highlight_node_links(node, i)
               {

                 console.log(node);
                let remainingNodes = [];
                let nextNodes = [];

               let stroke_opacity = 0;

               console.log(this.d3.select(node));
               if (node["data-clicked"] == 1) {
                   node["data-clicked"] = 0
                   stroke_opacity = 0.4;
               } else {
                   node["data-clicked"] = 1;
                   stroke_opacity = 1.0;
               }
               let traverse = [{
                   linkType: "sourceLinks",
                   nodeType: "target"
               }, {
                   linkType: "targetLinks",
                   nodeType: "source"
               }];

              
               traverse.forEach((step)=> {
                   node[step.linkType].forEach((link) =>{
                       remainingNodes.push(link[step.nodeType]);
                       console.log(link);
                      this.d3.select("#link-" + link.index).style("stroke-opacity", stroke_opacity);;
                   });



                   while (remainingNodes.length) {
                       nextNodes = [];
                       remainingNodes.forEach((node)=> {
                           node[step.linkType].forEach((link)=> {
                               nextNodes.push(link[step.nodeType]);

                          this.d3.select("#link-" + link.index).style("stroke-opacity", stroke_opacity);;
                           });
                       });
                       remainingNodes = nextNodes;
                   }
               });
             }




   setMaxSankeyChartDepth(maxDepth) {
       this.maxSankeyChartDepth = maxDepth;
   }

   getMaxSankeyChartDepth() {
       return this.maxSankeyChartDepth;
   }

   setMaxNodeLength(maxLength) {
       this.maxNodeLength = maxLength;
   }

   getMaxNodeLength() {
       return this.maxNodeLength;
   }



  constructor(element: ElementRef, private ngZone: NgZone, d3Service: D3Service) {
    this.d3 = d3Service.getD3();
    this.parentNativeElement = element.nativeElement;
  }

  ngOnInit() {
this.loadSankeyChartDataSet();
  }

sankeyChartData = [ 
     { depth: 1, source: 'Texas', target: '/index', value: 10 },
	 { depth: 1, source: 'Texas', target: '/welcome', value: 1 },
	 { depth: 1, source: 'Texas', target: '/home', value: 2 },
	 { depth: 1, source: 'Texas', target: '/Login', value: 3 },
	 { depth: 2, source: '/index', target: '/Login', value: 4 },
	 { depth: 2, source: '/index', target: '/Product', value: 5 },
	 { depth: 2, source: '/home', target: '/Product', value: 6 },
	 { depth: 2, source: '/home', target: '/Login', value: 7 },
	 { depth: 2, source: '/welcome', target: '/Category', value: 8 },
	 { depth: 2, source: '/welcome', target: '/PDP', value: 9 } ,
         { depth: 1, source: 'Florida', target: '/index', value: 10 },
         { depth: 1, source: 'Florida', target: '/welcome', value: 1 },
         { depth: 1, source: 'Florida', target: '/home', value: 2 },
         { depth: 1, source: 'Florida', target: '/Login', value: 3 },
         { depth: 2, source: '/index', target: '/Login', value: 4 },
         { depth: 2, source: '/index', target: '/Product', value: 5 },
         { depth: 2, source: '/home', target: '/Product', value: 6 },
         { depth: 2, source: '/home', target: '/Login', value: 7 },
         { depth: 2, source: '/welcome', target: '/Category', value: 8 },
         { depth: 2, source: '/welcome', target: '/PDP', value: 9 } ,
         { depth: 1, source: 'California', target: '/index', value: 10 },
         { depth: 1, source: 'California', target: '/Product', value: 1 },
         { depth: 1, source: 'California', target: '/home', value: 2 },
         { depth: 1, source: 'California', target: '/Login', value: 3 },
         { depth: 2, source: '/Product', target: '/Login', value: 4 },
         { depth: 2, source: '/index', target: '/Product', value: 5 },
         { depth: 2, source: '/home', target: '/Product', value: 6 },
         { depth: 2, source: '/home', target: '/Login', value: 7 },
         { depth: 2, source: '/welcome', target: '/Category', value: 8 },
         { depth: 2, source: '/welcome', target: '/PDP', value: 9 } ,
         { depth: 1, source: 'Georgia', target: '/index', value: 10 },
         { depth: 1, source: 'Georgia', target: '/welcome', value: 1 },
         { depth: 1, source: 'Georgia', target: '/home', value: 2 },
         { depth: 1, source: 'Georgia', target: '/Login', value: 3 },
         { depth: 2, source: '/index', target: '/Login', value: 4 },
         { depth: 2, source: '/index', target: '/Product', value: 5 },
         { depth: 2, source: '/home', target: '/Product', value: 6 },
         { depth: 2, source: '/home', target: '/Login', value: 7 },
         { depth: 2, source: '/welcome', target: '/Category', value: 8 },
         { depth: 2, source: '/welcome', target: '/PDP', value: 9 } ,	
    ];	
}
