const createLoadNavbar = (page) => {
    console.log("test1")
    fetch("/navbar.html")
        .then(res => res.text())
        .then(html => {
            document.getElementById("navbar").innerHTML = html;
            console.log("test")
        });
}

export default createLoadNavbar