#include "Demo.h"

namespace kk {

	PropertyMap * Demo::propertys(){
		return _propertys.as();
	}

	void Demo::setPropertys(PropertyMap * __newValue__){
		this->_propertys = __newValue__ ;
	}

	kk::String Demo::title(){
		return this->_title;
	}

	kk::Int Demo::version(){
		return this->_version;
	}

	kk::Boolean Demo::output(){
		return _output;
	}

	void Demo::setOutput(kk::Boolean __newValue__){
		this->_output = __newValue__ ;
	}

	kk::String (*Demo::ondone())(kk::String name){
		return _ondone.as();
	}

	void Demo::setOndone(kk::String ((*__newValue__)(kk::String name))){
		this->_ondone = __newValue__ ;
	}

	kk::String Demo::exec(kk::String name) {
		for(kk::Int i = (kk::Int)0,n = (kk::Int)10;i<n;i++) {
		}
		kk::Int v = (kk::Int)0;
		switch(v) {
		case 1 :
			break;
		default:
			break;
		}
		return this->done(name);
	}

	kk::String Demo::done(kk::String name) {
		kk::String ((*fn)(kk::String name)) = (kk::String ((*)(kk::String name)))this->_ondone.as();
		if(fn!=nullptr) {
			return (*(fn))(name);
		}
		return "";
	}

	Demo::Demo(kk::String title,kk::Int version) {
		this->_title="demo";
		this->_version=1.0;
		{
			PropertyMap * __V__ = new PropertyMap();
			this->_propertys = __V__;
		}
		this->_output=false;
		this->_ondone=nullptr;
		this->_title=title;
		this->_version=version;
	}

	IDemo * createDemo(kk::String title,kk::Int version) {
		return new Demo(title,version);
	}

}

