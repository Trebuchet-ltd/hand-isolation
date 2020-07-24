let webcam, labelContainer, letter, winCount, lossCount, winSound;

let l;

let processed;

window.onload = () => {

    initModel();
}

async function initModel() {
    // model = await tf.loadLayersModel(URL);
    console.log("Initialised");
    initButton();
}


function initButton() {
    let button = document.getElementById("webcamButton");
    button.classList.remove('disabled');
    button.disabled = false;
}


// Load the image model and setup the webcam
async function init() {

    // const modelURL = URL + "model.json";
    let buttonClicked = Date.now();
    let checkBox = document.getElementById("stream");

    if (checkBox.checked == true) {
        checkBox.checked = false;
        return;
    }

    checkBox.checked = true;
    let video = document.getElementById("videoInput"); // video is the id of video tag
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(function (stream) {
            video.srcObject = stream;
            video.play();
        })
        .catch(function (err) {
            console.log("An error occurred! " + err);
        });

    let cap = new cv.VideoCapture(video);

    const FPS = 30;
    let src = new cv.Mat(480, 640, cv.CV_8UC4);


    function processVideo() {

        let begin = Date.now();

        cap.read(src);

        let height = src.rows;
        let width = src.cols;
        let x1 = (width - height) / 2;
        let x2 = (width + height) / 2;
        let rect = new cv.Rect(x1, 0, x2, height);
        let square = new cv.Mat();
        square = src.roi(rect);

        let dsize = new cv.Size(308, 308);
        cv.resize(square, square, dsize, 0, 0, cv.INTER_AREA);

        cv.flip(square, square, +1);

        cv.imshow("webcam-canvas", square);

        // remove_pixels(square);

        let dst = processImage(square);

        cv.imshow("canvasOutput", dst);
        // src.delete();
        square.delete();
        dst.delete();

        // let image = tf.browser.fromPixels(document.getElementById("canvasOutput"), 1);
        // image = image.reshape([1, 128, 128, 1])



        // schedule next one.
        let delay = 1000 / FPS - (Date.now() - begin);

        if (checkBox.checked == true) {
            setTimeout(processVideo, delay);
        } else {
            stop(video)
        }
    }

    // schedule first one.
    setTimeout(processVideo, 0);
}

function stop(video) {
    var stream = video.srcObject;
    var tracks = stream.getTracks();

    for (var i = 0; i < tracks.length; i++) {
        var track = tracks[i];
        track.stop();
    }

    video.srcObject = null;
}

function conditions(r, g, b) {
    t1 = 20
    t2 = 20
    t3 = 30

    // RGB
    if (g - r > t1 && g - b > t1)
        return true
    if (b - r > t1 && b - g > t1)
        return true
    // if (r - b > t1 && r - g > t1)
    //     return true

    // CMY
    if (r - g > t2 && b - g > t2)
        return true
    if (r - b > t2 && g - b > t2)
        return true
    if (g - r > t2 && b - r > t2)
        return true

    // GRAY
    if (
        (Math.abs(r - b) < t3) &&
        (Math.abs(r - g) < t3) &&
        (Math.abs(b - g) < t3)
    ){
        return true;
    }

    return false
}

function remove_pixels(src) {
    let canvas = document.getElementById("webcam-canvas");
    var img = nj.images.read(canvas)
    let out = document.getElementById("canvasOutput");


    // console.log(img.shape)


    if (img.shape.length == 3) {

        processed = nj.images.resize(img, 128, 128)
        processed = processed.slice(null, null, [3])

        console.log(processed.shape)

        // nj.images.resize(img, 14, 12)

        // l = []
        for (let i = 0; i < processed.shape[0]; i++) {
            for (let j = 0; j < processed.shape[1]; j++) {
                let r = processed.get(i, j, 0);
                let g = processed.get(i, j, 1);
                let b = processed.get(i, j, 2);

                if (conditions(r, g, b)) {
                    processed.set(i, j, 0, 255)
                    processed.set(i, j, 1, 255)
                    processed.set(i, j, 2, 255)
                }
            }

        }
        nj.images.save(processed, out)

        // console.log(l)

    }




    // var gray = nj.images.rgb2gray(img)
    // nj.images.save(gray, out)
    // console.log(A)
    return src
}

function processImage(src) {
    // console.log("Creating dst.");
    let dst = new cv.Mat();
    let dsize = new cv.Size(128, 128);
    // console.log("Resize");
    cv.resize(src, dst, dsize, 0, 0, cv.INTER_AREA);
    let conv1 = new cv.Mat();
    let conv2 = new cv.Mat();
    // console.log("Convert colorspace.");
    cv.cvtColor(dst, conv1, cv.COLOR_RGB2HSV, 0);
    cv.cvtColor(dst, conv2, cv.COLOR_RGBA2GRAY, 0);

    let lower = [0, 40, 30, 0];
    let higher = [43, 255, 254, 255];
    // let lower = [0, 0, 0, 0];
    // let higher = [150, 150, 150, 255];

    // console.log("Mask.");
    let mask = new cv.Mat(128, 128, cv.CV_8UC3);
    let low = new cv.Mat(128, 128, cv.CV_8UC3, lower);
    // console.log(conv1.data)
    let high = new cv.Mat(128, 128, cv.CV_8UC3, higher);
    cv.inRange(conv1, low, high, mask);

    cv.addWeighted(mask, 0.5, mask, 0.5, 0.0, mask);
    // cv.medianBlur(mask, mask, 5);

    let skin = new cv.Mat();
    cv.bitwise_and(conv2, conv2, skin, mask)

    // console.log("Canny.");
    let edges = new cv.Mat();
    cv.Canny(skin, edges, 100, 200, 3, false);
    dst.delete();
    low.delete();
    high.delete();
    conv1.delete();
    conv2.delete();
    mask.delete();
    skin.delete();

    // console.log("Retruning.");
    return edges;
}
