//= require jquery
//= require jquery.turbolinks
//= require jquery_ujs
//= require bootstrap.min
//= require jquery.raty
//= require ratyrate
//= require bpmn-modeler.min
//= require bundle-cli
//= require turbolinks

$(document).ready(function(){
  toggle_rate();
  $('[data-toggle="tooltip"]').tooltip()
  $('body').on('click', '#save-diagram', save_diagram);
  $('body').on('click', '#completed_survey', completed_survey);
  $('body').on('click', '#start-survey', start_survey);

  $('body').on('click', '#save_xml_diagram', save_xml_diagram);
  $('body').on('click', '#save_svg_diagram', save_svg_diagram);
  $('body').on('submit', "#up_form", validate_responses);

  $('#company_employees_number').on('input', calc_sample_size );

  $('.accordion').click(function(){

    $(this).next().slideToggle();
    $(this).children().toggleClass('fa-caret-up');
    $(this).toggleClass('open');
  });

  $('.show-guides').click(function(){
    $(this).closest('tr').next().slideToggle();
    $(this).children().toggleClass('fa-chevron-down');
  });
});

/* Iniciar cuesetionario */
function start_survey(){
  $('.loading').show();
}
/* Terminar cuesetionario */
function completed_survey(){
  $('.loading').show();
  window.location.href = "/results";
}

/* No mostrar starRating cunado se selecciona No o No sabe */
function toggle_rate(){
  $('body').on('change', "input[type='radio']", function(){
    if(this.value < 3){
      $('.star').fadeTo(200, 0);
      $('.added-value-title').fadeTo(200, 0);
      $('.raty-cancel').click();
    }else{
      $('.star').fadeTo(200, 1);
      $('.added-value-title').fadeTo(200, 1);
    }
  });
}

/* Cargar diagrama */
var bpmnjs, canvas;
function load_bpmn(diagramXML, company_name){
  var BpmnViewer = window.BpmnJS;
  bpmnjs = new BpmnViewer({
    container: '#canvas',
    zoomScroll: { enabled: false },
    additionalModules: [CliModule],
    cli: { bindTo: 'cli' }
  });
  //import diagram
  bpmnjs.importXML(diagramXML, function(err) {
    if (err) { console.log(err); }
    canvas = bpmnjs.get('canvas');
    //canvas.zoom('fit-viewport');
    canvas.zoom(1);
  });
  waitForCliToResize(company_name);
}

/* Esperar que carque el modulo cli para poder modificar el diagrama */
function waitForCliToResize(company_name){
  if(typeof cli !== "undefined")
  {
    cli.setLabel('Participant_1jxwwcj', company_name);
    resize_canvas();
  }
  else{ setTimeout(function(){ waitForCliToResize(company_name); },250); }
}

/* Guardar diagrama (en la base de datos) */
function save_diagram(){
  $('.loading').show();
  bpmnjs.saveXML(function(err, xml){
    $.ajax({
      url: "/user_practice",
      type: "POST",
      data: {xml_diagram: xml},
      success: function(resp){ window.location.href = "/results";  },
      error: function(){ window.location.href = "/results"; }
    });
  });
}

/* Guardar diagrama (como XML) */
function save_xml_diagram(e) {
  var xml_link = $('#save_xml_diagram');
  bpmnjs.saveXML({format: true }, function(err, xml){
    setEncoded(xml_link, 'diagram.bpmn', err? null : xml);
    xml_link.removeClass('active');
  });
}
/* Guardar diagrama (como SVG) */
function save_svg_diagram(link){
  var svg_link = $('#save_svg_diagram');
  bpmnjs.saveSVG(function(err, svg){
    setEncoded(svg_link, 'diagram.svg', err ? nll: svg);
    svg_link.removeClass('active');
  });
}


function setEncoded(link, name, data) {
  var encodedData = encodeURIComponent(data);
  if (data) {
    link.addClass('active').attr({
      'href': 'data:application/bpmn20-xml;charset=UTF-8,' + encodedData,
      'download': name
    });
  }
}

/* Si no se selecciona ninguna respuesta se muestra alerta */
function validate_responses(){
  if ( !$("input[name='user_practice[answer]']:checked").val() ){
    $('.warning-options').fadeIn();
    return false;
  }
}

missing_lane = "";
function add_missing_lane(){
  /* Recorriendo carriles hacia abajo*/
  var elems = cli.elements();
  for(j in elems){
    if(elems[j].startsWith("Participant")){
      cli.move(elems[j], {x:0, y:130});
    }
  }
  /* Añadiendo carrill al principio */
  var width = cli.element('Participant_1jxwwcj').width;
  missing_lane = cli.create("bpmn:Participant",  {x:78, y:20, width:width, height:120}, "Collaboration_07pzko3");
}

x = 0;
function add_missing_practice(practice){
  var is_missing = true;
  var elems = cli.elements();
  for(j in elems){
    var elem = cli.element(elems[j]);
    if(practice == elem.businessObject.name){
      is_missing = false;
      break;
    }
  }

  if(is_missing){
    var missing_practice = cli.create("bpmn:Task", {x:160+x,y:80}, missing_lane);
    cli.setLabel(missing_practice, practice);
    canvas.addMarker(missing_practice, 'highlight');
    x += 150;
  }
}

function delete_lane_if_empty(){
  if (cli.element(missing_lane).children.length == 0){
    cli.removeShape(missing_lane);
    /* Recorriendo carriles hacia arriba */
    var elems = cli.elements();
    for(j in elems){
      if(elems[j].startsWith("Participant")){
        console.log(elems[j]);
        cli.move(elems[j], {x:0, y:-130});
      }
    }
  }
}

function remove_practice(practice){
  var elements = cli.elements();

  for(i in elements){
    var elem = cli.element(elements[i]);
    if(practice == elem.businessObject.name){
      var incoming_id = cli.element(elem.id).incoming[0].source.id;
      if(cli.element(elem.id).outgoing.length > 0){
        var outgoing_id = cli.element(elem.id).outgoing[0].target.id;
        cli.connect(incoming_id, outgoing_id, 'bpmn:SequenceFlow');
      }
      cli.removeShape(elem.id);
      break;
    }
  }
}

function change_practice(p_old, p_new){
  var elements = cli.elements();
  var overlays = bpmnjs.get('overlays');
  var agileOverlay = '<div class="agile-overlay"><i class="fa fa-tag"></i> Práctica ágil </div>';

  for(i in elements){
    var elem = cli.element(elements[i]);

    if(p_old == elem.businessObject.name){
      cli.setLabel(elem, p_new);
      overlays.add(elements[i], { position: { bottom: -3, right: 50 }, html: agileOverlay });
      break;
    }
  }
}

/* Resize canvas:
Aumenta el tamaño del div para
que aparesca el scroll bar */
function resize_canvas(scrollLeft){
  var elems = cli.elements();
  width = 0;
  for(var i=0; i< elems.length; i++){
    if(elems[i].startsWith("Participant")){
      var elem = cli.element(elems[i]);
      if (width < elem.width + 100)
      width = elem.width + 100;
    }
  }
  $("#canvas").width(width + "px");
  if(scrollLeft)
  $(".scroll-canvas").scrollLeft(width);
}


function calc_sample_size(){
  var N = $('#company_employees_number').val();
  var variance_p = 0.3 * 0.3;  //Varianza al cuadrado
  var confidence_p = 1.28 * 1.28;
  var error_p= 0.1 * 0.1;

  //var n = (N*(variance**2)*(confidence**2)) / ( (error**2)*(N-1) + (variance**2) * (confidence**2) );
  var n = (N * variance_p * confidence_p) / ( error_p * (N-1) + (variance_p) * (confidence_p) );
  $('#sample-size').val(Math.round(n));
}
